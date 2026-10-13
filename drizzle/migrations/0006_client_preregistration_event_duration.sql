CREATE TABLE public.client_preregistrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received','reviewed')),
 client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
 event_id uuid REFERENCES public.events(id) ON DELETE RESTRICT,
 payload jsonb, expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), received_at timestamptz, reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.client_preregistrations TO authenticated;
GRANT ALL ON public.client_preregistrations TO service_role;
ALTER TABLE public.client_preregistrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY intake_read ON public.client_preregistrations FOR SELECT TO authenticated USING (public.can('clients','view'));
CREATE POLICY intake_create ON public.client_preregistrations FOR INSERT TO authenticated WITH CHECK (public.can('clients','create') AND created_by = auth.uid() AND status = 'pending' AND payload IS NULL AND reviewed_by IS NULL AND received_at IS NULL AND reviewed_at IS NULL AND (client_id IS NULL OR EXISTS(SELECT 1 FROM public.clients c WHERE c.id=client_id)) AND (event_id IS NULL OR (public.can('events','view') AND EXISTS(SELECT 1 FROM public.events e WHERE e.id=event_id AND e.client_id=client_id))));
CREATE INDEX intake_created ON public.client_preregistrations(created_at DESC);
ALTER TABLE public.events ADD COLUMN duration_minutes integer, ADD COLUMN venue_city text, ADD COLUMN venue_state text, ADD COLUMN latitude double precision, ADD COLUMN longitude double precision, ADD COLUMN place_id text, ADD COLUMN preregistration_id uuid REFERENCES public.client_preregistrations(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX events_preregistration_unique ON public.events(preregistration_id) WHERE preregistration_id IS NOT NULL;
UPDATE public.events SET duration_minutes = (extract(epoch FROM (end_time - start_time))::integer + 86400) % 86400 / 60 WHERE start_time IS NOT NULL AND end_time IS NOT NULL AND start_time <> end_time AND extract(second FROM start_time)=0 AND extract(second FROM end_time)=0;
COMMENT ON COLUMN public.clients.phone IS 'DEPRECATED in client forms: WhatsApp is the primary contact; retained for historical records.';
CREATE FUNCTION public.validate_event_duration() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.duration_minutes IS NOT NULL THEN
  IF NEW.duration_minutes < 1 OR NEW.duration_minutes > 1439 OR NEW.start_time IS NULL THEN RAISE EXCEPTION 'Informe início e duração entre 1 e 1439 minutos'; END IF;
  IF TG_OP='INSERT' OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes OR NEW.start_time IS DISTINCT FROM OLD.start_time THEN NEW.end_time := (NEW.start_time + make_interval(mins => NEW.duration_minutes))::time; END IF;
 END IF;
 IF NEW.latitude IS NOT NULL AND (NEW.latitude < -90 OR NEW.latitude > 90) OR NEW.longitude IS NOT NULL AND (NEW.longitude < -180 OR NEW.longitude > 180) THEN RAISE EXCEPTION 'Coordenadas inválidas'; END IF;
 IF length(NEW.venue_city)>150 OR length(NEW.venue_state)>2 OR length(NEW.place_id)>300 THEN RAISE EXCEPTION 'Localização inválida'; END IF;
 IF NEW.preregistration_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.preregistration_id IS DISTINCT FROM OLD.preregistration_id) THEN
  IF NOT public.can('clients','view') OR NOT EXISTS(SELECT 1 FROM public.client_preregistrations p WHERE p.id=NEW.preregistration_id AND p.status='reviewed' AND p.client_id=NEW.client_id AND p.event_id IS NULL) THEN RAISE EXCEPTION 'Pré-cadastro não disponível para este evento'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER event_duration_validation BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.validate_event_duration();
CREATE FUNCTION public.link_preregistration_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.preregistration_id IS NOT NULL THEN UPDATE public.client_preregistrations SET event_id=NEW.id WHERE id=NEW.preregistration_id; END IF; RETURN NEW; END $$;
CREATE TRIGGER event_preregistration_link AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.link_preregistration_event();
CREATE FUNCTION public.submit_client_preregistration(_hash text, _payload jsonb) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.client_preregistrations;
BEGIN
 SELECT * INTO p FROM public.client_preregistrations WHERE token_hash=_hash FOR UPDATE;
 IF p.id IS NULL OR p.expires_at <= now() THEN RAISE EXCEPTION 'Link inválido ou expirado'; END IF;
 IF p.status <> 'pending' THEN RETURN 'already_received'; END IF;
 IF jsonb_typeof(_payload)<>'object' OR octet_length(_payload::text)>20000 OR length(trim(_payload->>'full_name'))<2 OR length(_payload->>'full_name')>150 OR length(_payload->>'event_title')<2 OR length(_payload->>'event_title')>200 OR length(_payload->>'cpf')<>11 OR (_payload->>'cpf')!~'^[0-9]{11}$' OR length(_payload->>'whatsapp') NOT IN (10,11) OR length(_payload->>'notes')>5000 THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
 UPDATE public.client_preregistrations SET payload=_payload,status='received',received_at=now() WHERE id=p.id;
 RETURN 'received';
END $$;
REVOKE ALL ON FUNCTION public.submit_client_preregistration(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_client_preregistration(text,jsonb) TO service_role;
CREATE FUNCTION public.review_client_preregistration(_id uuid, _client_id uuid, _fill_missing boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.client_preregistrations; c uuid; d jsonb;
BEGIN
 IF NOT public.can('clients','view') OR NOT public.can('clients','edit') THEN RAISE EXCEPTION 'Sem permissão para revisar'; END IF;
 SELECT * INTO p FROM public.client_preregistrations WHERE id=_id FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Pré-cadastro não encontrado'; END IF;
 IF p.status='reviewed' THEN RETURN p.client_id; END IF;
 IF p.status<>'received' THEN RAISE EXCEPTION 'Aguarde o envio do cliente'; END IF;
 d:=p.payload; c:=coalesce(p.client_id,_client_id);
 IF p.client_id IS NOT NULL AND _client_id IS NOT NULL AND p.client_id<>_client_id THEN RAISE EXCEPTION 'Cliente já vinculado'; END IF;
 IF c IS NULL THEN
  IF NOT public.can('clients','create') THEN RAISE EXCEPTION 'Sem permissão para criar cliente'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(d->>'cpf',0));
  IF EXISTS(SELECT 1 FROM public.clients WHERE regexp_replace(coalesce(cpf,''),'[^0-9]','','g')=d->>'cpf' OR regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g')=d->>'whatsapp' OR lower(email)=lower(d->>'email')) THEN RAISE EXCEPTION 'Há um cliente com CPF, WhatsApp ou e-mail correspondente. Revise e selecione o cadastro existente.'; END IF;
  INSERT INTO public.clients(full_name,birth_date,cpf,rg,whatsapp,email,zip_code,address,address_number,address_complement,neighborhood,city,state,notes,created_by)
  VALUES(d->>'full_name',nullif(d->>'birth_date','')::date,d->>'cpf',nullif(d->>'rg',''),d->>'whatsapp',d->>'email',d->>'zip_code',d->>'address',d->>'address_number',d->>'address_complement',d->>'neighborhood',d->>'city',d->>'state',d->>'notes',auth.uid()) RETURNING id INTO c;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=c) THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  IF _fill_missing THEN UPDATE public.clients SET
   birth_date=coalesce(birth_date,nullif(d->>'birth_date','')::date),cpf=coalesce(nullif(cpf,''),d->>'cpf'),rg=coalesce(nullif(rg,''),d->>'rg'),whatsapp=coalesce(nullif(whatsapp,''),d->>'whatsapp'),email=coalesce(nullif(email,''),d->>'email'),zip_code=coalesce(nullif(zip_code,''),d->>'zip_code'),address=coalesce(nullif(address,''),d->>'address'),address_number=coalesce(nullif(address_number,''),d->>'address_number'),address_complement=coalesce(nullif(address_complement,''),d->>'address_complement'),neighborhood=coalesce(nullif(neighborhood,''),d->>'neighborhood'),city=coalesce(nullif(city,''),d->>'city'),state=coalesce(nullif(state,''),d->>'state') WHERE id=c; END IF;
 END IF;
 UPDATE public.client_preregistrations SET client_id=c,status='reviewed',reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_id;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.review_client_preregistration(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_client_preregistration(uuid,uuid,boolean) TO authenticated;
