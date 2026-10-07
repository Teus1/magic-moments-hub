CREATE TYPE public.payment_method AS ENUM ('pix','credit','debit','cash','boleto','transfer','previous_balance');

CREATE TABLE public.event_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  method public.payment_method NOT NULL DEFAULT 'pix',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_payments_event_id_idx ON public.event_payments(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_payments TO authenticated;
GRANT ALL ON public.event_payments TO service_role;
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_payments_view ON public.event_payments FOR SELECT TO authenticated USING (public.can('events','view'));
CREATE POLICY event_payments_create ON public.event_payments FOR INSERT TO authenticated WITH CHECK (public.can('events','create') OR public.can('events','edit'));
CREATE POLICY event_payments_edit ON public.event_payments FOR UPDATE TO authenticated USING (public.can('events','edit')) WITH CHECK (public.can('events','edit'));
CREATE POLICY event_payments_delete ON public.event_payments FOR DELETE TO authenticated USING (public.can('events','edit') OR public.can('events','delete'));

INSERT INTO public.event_payments (event_id, amount, paid_at, method, created_by)
SELECT id, received_value, COALESCE(created_at::date, CURRENT_DATE), 'previous_balance', created_by
FROM public.events WHERE received_value > 0;

CREATE OR REPLACE FUNCTION public.sync_event_received_value()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _event uuid;
BEGIN
  _event := COALESCE(NEW.event_id, OLD.event_id);
  UPDATE public.events SET received_value = COALESCE((SELECT sum(amount) FROM public.event_payments WHERE event_id = _event), 0)
  WHERE id = _event;
  IF TG_OP = 'UPDATE' AND OLD.event_id <> NEW.event_id THEN
    UPDATE public.events SET received_value = COALESCE((SELECT sum(amount) FROM public.event_payments WHERE event_id = OLD.event_id), 0)
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_event_received_value() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER event_payments_sync AFTER INSERT OR UPDATE OR DELETE ON public.event_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_event_received_value();