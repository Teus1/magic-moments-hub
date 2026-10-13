ALTER TABLE public.events
 ADD COLUMN IF NOT EXISTS guest_count integer,
 ADD COLUMN IF NOT EXISTS social_media_consent boolean,
 ADD COLUMN IF NOT EXISTS instagram_handles text,
 ADD COLUMN IF NOT EXISTS referral_source text,
 ADD COLUMN IF NOT EXISTS referral_other text;

CREATE OR REPLACE FUNCTION public.validate_event_extra_info() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
 IF NEW.guest_count IS NOT NULL AND (NEW.guest_count < 1 OR NEW.guest_count > 100000) THEN RAISE EXCEPTION 'Quantidade de convidados inválida'; END IF;
 IF NEW.social_media_consent IS DISTINCT FROM true THEN NEW.instagram_handles := NULL; END IF;
 IF length(NEW.instagram_handles) > 300 THEN RAISE EXCEPTION 'Instagram muito longo'; END IF;
 IF NEW.referral_source IS NOT NULL AND NEW.referral_source NOT IN ('instagram_facebook','indicacao','evento_conhecido','casamentos_com_br','outro') THEN RAISE EXCEPTION 'Origem inválida'; END IF;
 IF NEW.referral_source IS DISTINCT FROM 'outro' THEN NEW.referral_other := NULL;
 ELSIF coalesce(trim(NEW.referral_other),'') = '' OR length(NEW.referral_other) > 150 THEN RAISE EXCEPTION 'Informe como nos conheceu'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER event_extra_info_validation BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.validate_event_extra_info();

CREATE OR REPLACE FUNCTION public.submit_client_preregistration(_hash text, _payload jsonb)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.client_preregistrations; e jsonb;
BEGIN
 SELECT * INTO p FROM public.client_preregistrations WHERE token_hash=_hash FOR UPDATE;
 IF p.id IS NULL OR p.expires_at <= now() THEN RAISE EXCEPTION 'Link inválido ou expirado'; END IF;
 IF p.status <> 'pending' THEN RETURN 'already_received'; END IF;
 IF jsonb_typeof(_payload)<>'object' OR octet_length(_payload::text)>20000 OR length(trim(_payload->>'full_name'))<2 OR length(_payload->>'full_name')>150 OR length(_payload->>'event_title')<2 OR length(_payload->>'event_title')>200 OR length(_payload->>'cpf')<>11 OR (_payload->>'cpf')!~'^[0-9]{11}$' OR length(_payload->>'whatsapp') NOT IN (10,11) OR length(_payload->>'notes')>5000 THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
 e := _payload->'event';
 IF e IS NOT NULL THEN
  IF jsonb_typeof(e)<>'object' OR length(coalesce(e->>'venue',''))>300 OR length(coalesce(e->>'address',''))>500 OR length(coalesce(e->>'attraction_start_location',''))>300 OR length(coalesce(e->>'ceremonial_name',''))>150 OR length(coalesce(e->>'ceremonial_contact',''))>150
   OR length(coalesce(e->>'instagram_handles',''))>300 OR length(coalesce(e->>'referral_other',''))>150
   OR (coalesce(e->>'guest_count','') <> '' AND ((e->>'guest_count')!~'^[0-9]{1,6}$' OR (e->>'guest_count')::int NOT BETWEEN 1 AND 100000))
   OR (coalesce(e->>'referral_source','') <> '' AND e->>'referral_source' NOT IN ('instagram_facebook','indicacao','evento_conhecido','casamentos_com_br','outro'))
   OR (e->>'referral_source' = 'outro' AND coalesce(trim(e->>'referral_other'),'') = '')
   OR (coalesce(e->>'duration_minutes','') <> '' AND ((e->>'duration_minutes')!~'^[0-9]{1,4}$' OR (e->>'duration_minutes')::int NOT BETWEEN 1 AND 1439))
   OR (coalesce(e->>'start_time','') <> '' AND (e->>'start_time')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$')
   OR (coalesce(e->>'attraction_id','') <> '' AND NOT EXISTS(SELECT 1 FROM public.attractions a WHERE a.id::text=e->>'attraction_id' AND a.status='active'))
   OR (coalesce(e->>'service_id','') <> '' AND NOT EXISTS(SELECT 1 FROM public.services s WHERE s.id::text=e->>'service_id' AND s.status='active'))
  THEN RAISE EXCEPTION 'Dados do evento inválidos'; END IF;
 END IF;
 UPDATE public.client_preregistrations SET payload=_payload,status='received',received_at=now() WHERE id=p.id;
 RETURN 'received';
END $function$;