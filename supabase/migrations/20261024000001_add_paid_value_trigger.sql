-- Trigger para manter paid_value sincronizado com collaborator_payments
CREATE OR REPLACE FUNCTION public.sync_event_collaborator_paid_value()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Atualiza paid_value na tabela event_collaborators baseado na soma dos pagamentos
  UPDATE public.event_collaborators ec
  SET paid_value = COALESCE((
    SELECT SUM(cp.amount)
    FROM public.collaborator_payments cp
    WHERE cp.event_collaborator_id = ec.id
  ), 0),
  updated_at = now()
  WHERE ec.id = COALESCE(NEW.event_collaborator_id, OLD.event_collaborator_id);
  
  RETURN NULL;
END;
$$;

-- Trigger no INSERT
DROP TRIGGER IF EXISTS collaborator_payments_sync_paid_value_insert ON public.collaborator_payments;
CREATE TRIGGER collaborator_payments_sync_paid_value_insert
AFTER INSERT ON public.collaborator_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_event_collaborator_paid_value();

-- Trigger no UPDATE
DROP TRIGGER IF EXISTS collaborator_payments_sync_paid_value_update ON public.collaborator_payments;
CREATE TRIGGER collaborator_payments_sync_paid_value_update
AFTER UPDATE ON public.collaborator_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_event_collaborator_paid_value();

-- Trigger no DELETE
DROP TRIGGER IF EXISTS collaborator_payments_sync_paid_value_delete ON public.collaborator_payments;
CREATE TRIGGER collaborator_payments_sync_paid_value_delete
AFTER DELETE ON public.collaborator_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_event_collaborator_paid_value();