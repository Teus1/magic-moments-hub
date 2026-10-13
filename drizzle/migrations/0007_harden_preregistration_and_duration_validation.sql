CREATE OR REPLACE FUNCTION public.validate_event_duration() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.duration_minutes IS NOT NULL THEN
  IF NEW.duration_minutes < 1 OR NEW.duration_minutes > 1439 OR NEW.start_time IS NULL THEN RAISE EXCEPTION 'Informe início e duração entre 1 e 1439 minutos'; END IF;
  NEW.end_time := (NEW.start_time + make_interval(mins => NEW.duration_minutes))::time;
 END IF;
 IF NEW.latitude IS NOT NULL AND (NEW.latitude < -90 OR NEW.latitude > 90) OR NEW.longitude IS NOT NULL AND (NEW.longitude < -180 OR NEW.longitude > 180) THEN RAISE EXCEPTION 'Coordenadas inválidas'; END IF;
 IF length(NEW.venue_city)>150 OR length(NEW.venue_state)>2 OR length(NEW.place_id)>300 THEN RAISE EXCEPTION 'Localização inválida'; END IF;
 IF NEW.preregistration_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.preregistration_id IS DISTINCT FROM OLD.preregistration_id) THEN
  IF NOT public.can('clients','view') OR NOT EXISTS(SELECT 1 FROM public.client_preregistrations p WHERE p.id=NEW.preregistration_id AND p.status='reviewed' AND p.client_id=NEW.client_id AND p.event_id IS NULL) THEN RAISE EXCEPTION 'Pré-cadastro não disponível para este evento'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.serialize_preregistration_review() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF OLD.status='received' AND NEW.status='reviewed' THEN PERFORM pg_advisory_xact_lock(83901273); END IF; RETURN NEW; END $$;
CREATE FUNCTION public.lock_client_identity_creation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN PERFORM pg_advisory_xact_lock(83901273); RETURN NEW; END $$;
CREATE TRIGGER client_identity_serialization BEFORE INSERT ON public.clients FOR EACH STATEMENT EXECUTE FUNCTION public.lock_client_identity_creation();
CREATE OR REPLACE FUNCTION public.validate_preregistration_payload() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.status='received' AND (TG_OP='INSERT' OR OLD.status='pending') THEN
  IF NEW.payload IS NULL OR NOT (NEW.payload ?& ARRAY['full_name','cpf','whatsapp','email','event_title','consent']) OR coalesce(NEW.payload->>'consent','false')<>'true' OR coalesce(NEW.payload->>'email','')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Dados obrigatórios inválidos'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER intake_payload_validation BEFORE INSERT OR UPDATE ON public.client_preregistrations FOR EACH ROW EXECUTE FUNCTION public.validate_preregistration_payload();