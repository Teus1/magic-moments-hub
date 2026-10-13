ALTER TABLE public.client_preregistrations ADD COLUMN recipient_name text, ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.client_preregistrations ADD CONSTRAINT intake_recipient_name_length CHECK (recipient_name IS NULL OR length(trim(recipient_name)) BETWEEN 1 AND 150);
CREATE FUNCTION public.delete_client_intake_link(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.can('clients','view') OR NOT public.can('clients','delete') THEN RAISE EXCEPTION 'Sem permissão para excluir links'; END IF;
 PERFORM 1 FROM public.client_preregistrations WHERE id = _id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ficha não encontrada'; END IF;
 UPDATE public.client_preregistrations SET deleted_at = now(), deleted_by = auth.uid(), expires_at = least(expires_at, now()), token_hash = encode(extensions.digest(gen_random_uuid()::text, 'sha256'), 'hex') WHERE id = _id AND deleted_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.delete_client_intake_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_client_intake_link(uuid) TO authenticated;
CREATE FUNCTION public.guard_deleted_intake_review() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF OLD.deleted_at IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Esta ficha foi excluída'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_deleted_intake_review BEFORE UPDATE ON public.client_preregistrations FOR EACH ROW EXECUTE FUNCTION public.guard_deleted_intake_review();
CREATE FUNCTION public.guard_deleted_intake_event() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.preregistration_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.preregistration_id IS DISTINCT FROM OLD.preregistration_id) THEN
  PERFORM 1 FROM public.client_preregistrations WHERE id = NEW.preregistration_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ficha indisponível para criar evento'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_deleted_intake_event BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.guard_deleted_intake_event();