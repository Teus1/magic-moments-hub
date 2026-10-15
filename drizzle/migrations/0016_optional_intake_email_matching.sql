CREATE OR REPLACE FUNCTION public.review_client_preregistration(_id uuid, _client_id uuid, _fill_missing boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.client_preregistrations; c uuid; d jsonb;
BEGIN
 IF NOT public.can('clients','view') OR NOT public.can('clients','edit') THEN RAISE EXCEPTION 'Sem permissão para revisar'; END IF;
 SELECT * INTO p FROM public.client_preregistrations WHERE id=_id FOR UPDATE;
 IF p.id IS NULL OR p.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Pré-cadastro não encontrado'; END IF;
 IF p.status='reviewed' THEN RETURN p.client_id; END IF;
 IF p.status<>'received' THEN RAISE EXCEPTION 'Aguarde o envio do cliente'; END IF;
 d:=p.payload; c:=coalesce(p.client_id,_client_id);
 IF p.client_id IS NOT NULL AND _client_id IS NOT NULL AND p.client_id<>_client_id THEN RAISE EXCEPTION 'Cliente já vinculado'; END IF;
 IF c IS NULL THEN
  IF NOT public.can('clients','create') THEN RAISE EXCEPTION 'Sem permissão para criar cliente'; END IF;
  PERFORM pg_advisory_xact_lock(83901273);
  IF EXISTS(SELECT 1 FROM public.clients WHERE regexp_replace(coalesce(cpf,''),'[^0-9]','','g')=d->>'cpf' OR regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g')=d->>'whatsapp' OR lower(email)=lower(nullif(trim(d->>'email'),''))) THEN RAISE EXCEPTION 'Há um cliente com CPF, WhatsApp ou e-mail correspondente. Revise e selecione o cadastro existente.'; END IF;
  INSERT INTO public.clients(full_name,birth_date,cpf,rg,whatsapp,email,zip_code,address,address_number,address_complement,neighborhood,city,state,notes,created_by)
  VALUES(d->>'full_name',nullif(d->>'birth_date','')::date,d->>'cpf',nullif(d->>'rg',''),d->>'whatsapp',nullif(trim(d->>'email'),''),d->>'zip_code',d->>'address',d->>'address_number',d->>'address_complement',d->>'neighborhood',d->>'city',d->>'state',d->>'notes',auth.uid()) RETURNING id INTO c;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=c) THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  IF _fill_missing THEN UPDATE public.clients SET
   birth_date=coalesce(birth_date,nullif(d->>'birth_date','')::date),cpf=coalesce(nullif(cpf,''),d->>'cpf'),rg=coalesce(nullif(rg,''),d->>'rg'),whatsapp=coalesce(nullif(whatsapp,''),d->>'whatsapp'),email=coalesce(nullif(email,''),nullif(trim(d->>'email'),'')),zip_code=coalesce(nullif(zip_code,''),d->>'zip_code'),address=coalesce(nullif(address,''),d->>'address'),address_number=coalesce(nullif(address_number,''),d->>'address_number'),address_complement=coalesce(nullif(address_complement,''),d->>'address_complement'),neighborhood=coalesce(nullif(neighborhood,''),d->>'neighborhood'),city=coalesce(nullif(city,''),d->>'city'),state=coalesce(nullif(state,''),d->>'state') WHERE id=c; END IF;
 END IF;
 UPDATE public.client_preregistrations SET client_id=c,status='reviewed',reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_id;
 RETURN c;
END $$;