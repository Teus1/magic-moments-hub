-- Lançamentos de pagamento da equipe (espelho de event_payments)
CREATE TABLE public.collaborator_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_collaborator_id uuid NOT NULL REFERENCES public.event_collaborators(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL,
  method payment_method NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX collaborator_payments_link_idx ON public.collaborator_payments (event_collaborator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_payments TO authenticated;
GRANT ALL ON public.collaborator_payments TO service_role;

ALTER TABLE public.collaborator_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY collaborator_payments_view ON public.collaborator_payments
  FOR SELECT TO authenticated USING (public.can('events','view'));
CREATE POLICY collaborator_payments_create ON public.collaborator_payments
  FOR INSERT TO authenticated WITH CHECK (public.can('events','create') OR public.can('events','edit'));
CREATE POLICY collaborator_payments_edit ON public.collaborator_payments
  FOR UPDATE TO authenticated USING (public.can('events','edit')) WITH CHECK (public.can('events','edit'));
CREATE POLICY collaborator_payments_delete ON public.collaborator_payments
  FOR DELETE TO authenticated USING (public.can('events','edit') OR public.can('events','delete'));

-- Preserva os valores já pagos como lançamento de saldo anterior, antes de o trigger passar a derivar o total.
INSERT INTO public.collaborator_payments (event_collaborator_id, amount, paid_at, method, created_by)
SELECT id, paid_value, COALESCE(created_at::date, CURRENT_DATE), 'previous_balance', created_by
FROM public.event_collaborators
WHERE paid_value > 0;

CREATE OR REPLACE FUNCTION public.sync_event_collaborator_paid_value()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _link uuid;
BEGIN
  _link := COALESCE(NEW.event_collaborator_id, OLD.event_collaborator_id);
  UPDATE public.event_collaborators
     SET paid_value = COALESCE((SELECT sum(amount) FROM public.collaborator_payments WHERE event_collaborator_id = _link), 0)
   WHERE id = _link;
  RETURN NULL;
END; $$;

CREATE TRIGGER collaborator_payments_sync AFTER INSERT OR DELETE OR UPDATE ON public.collaborator_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_collaborator_paid_value();