CREATE OR REPLACE FUNCTION public.validate_preregistration_payload() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE e jsonb; k text;
BEGIN
 IF NEW.status='received' AND (TG_OP='INSERT' OR OLD.status='pending') THEN
  IF NEW.payload IS NULL OR NOT (NEW.payload ?& ARRAY['full_name','cpf','whatsapp','email','event_title','consent']) OR coalesce(NEW.payload->>'consent','false')<>'true' THEN RAISE EXCEPTION 'Dados obrigatórios inválidos'; END IF;
  IF coalesce(NEW.payload->>'email','')<>'' AND NEW.payload->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'E-mail inválido'; END IF;
  IF NEW.payload->>'schema_version'='2' THEN
   FOREACH k IN ARRAY ARRAY['full_name','birth_date','cpf','rg','whatsapp','zip_code','address','address_number','neighborhood','city','state','event_title','event_type','event_date'] LOOP
    IF coalesce(trim(NEW.payload->>k),'')='' THEN RAISE EXCEPTION 'Campo obrigatório: %',k; END IF;
   END LOOP;
   IF NEW.payload->>'zip_code' !~ '^[0-9]{8}$' OR NEW.payload->>'state' !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'Endereço inválido'; END IF;
   PERFORM (NEW.payload->>'birth_date')::date; PERFORM (NEW.payload->>'event_date')::date;
   e:=NEW.payload->'event';
   IF e IS NULL OR jsonb_typeof(e)<>'object' THEN RAISE EXCEPTION 'Evento obrigatório'; END IF;
   FOREACH k IN ARRAY ARRAY['start_time','duration_minutes','service_id','venue','address','venue_city','venue_state','referral_source'] LOOP
    IF coalesce(trim(e->>k),'')='' THEN RAISE EXCEPTION 'Campo do evento obrigatório: %',k; END IF;
   END LOOP;
   IF e->>'venue_state' !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'Informe a UF do local com duas letras'; END IF;
   IF jsonb_typeof(e->'social_media_consent') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Escolha a autorização de divulgação'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;