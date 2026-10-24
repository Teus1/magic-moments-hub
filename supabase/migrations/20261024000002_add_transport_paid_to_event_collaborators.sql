-- Adiciona campos para pagamento de deslocamento separado do serviço
ALTER TABLE public.event_collaborators
  ADD COLUMN IF NOT EXISTS transport_paid_value numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_paid_value numeric(10,2) NOT NULL DEFAULT 0;

-- Comentários
COMMENT ON COLUMN public.event_collaborators.transport_paid_value IS 'Valor pago referente ao deslocamento/combustível (separado do serviço).';
COMMENT ON COLUMN public.event_collaborators.service_paid_value IS 'Valor pago referente ao serviço/operacional (separado do deslocamento).';

-- Atualiza valores existentes: migra paid_value atual para service_paid_value
UPDATE public.event_collaborators
SET service_paid_value = paid_value
WHERE service_paid_value = 0 AND paid_value > 0;

-- Trigger para sync de service_paid_value (pagamentos categoria 'service')
CREATE OR REPLACE FUNCTION public.sync_event_collaborator_service_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.event_collaborators ec
  SET service_paid_value = COALESCE((
    SELECT SUM(cp.amount)
    FROM public.collaborator_payments cp
    WHERE cp.event_collaborator_id = ec.id
      AND cp.category = 'service'
  ), 0),
  updated_at = now()
  WHERE ec.id = COALESCE(NEW.event_collaborator_id, OLD.event_collaborator_id);
  RETURN NULL;
END;
$$;

-- Trigger para sync de transport_paid_value (pagamentos categoria 'transport')
CREATE OR REPLACE FUNCTION public.sync_event_collaborator_transport_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.event_collaborators ec
  SET transport_paid_value = COALESCE((
    SELECT SUM(cp.amount)
    FROM public.collaborator_payments cp
    WHERE cp.event_collaborator_id = ec.id
      AND cp.category = 'transport'
  ), 0),
  updated_at = now()
  WHERE ec.id = COALESCE(NEW.event_collaborator_id, OLD.event_collaborator_id);
  RETURN NULL;
END;
$$;

-- Trigger geral para manter paid_value = service_paid + transport_paid (compatibilidade)
CREATE OR REPLACE FUNCTION public.sync_event_collaborator_paid_total()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.event_collaborators ec
  SET paid_value = COALESCE(ec.service_paid_value, 0) + COALESCE(ec.transport_paid_value, 0),
      updated_at = now()
  WHERE ec.id = COALESCE(NEW.event_collaborator_id, OLD.event_collaborator_id);
  RETURN NULL;
END;
$$;

-- Adiciona categoria na tabela collaborator_payments
ALTER TABLE public.collaborator_payments
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'service'
  CHECK (category IN ('service', 'transport'));

-- Atualiza pagamentos existentes para 'service'
UPDATE public.collaborator_payments SET category = 'service' WHERE category IS NULL;

-- Triggers nos pagamentos
DROP TRIGGER IF EXISTS collaborator_payments_sync_service_paid ON public.collaborator_payments;
CREATE TRIGGER collaborator_payments_sync_service_paid
AFTER INSERT OR UPDATE OR DELETE ON public.collaborator_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_event_collaborator_service_paid();

DROP TRIGGER IF EXISTS collaborator_payments_sync_transport_paid ON public.collaborator_payments;
CREATE TRIGGER collaborator_payments_sync_transport_paid
AFTER INSERT OR UPDATE OR DELETE ON public.collaborator_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_event_collaborator_transport_paid();

DROP TRIGGER IF EXISTS collaborator_payments_sync_paid_total ON public.collaborator_payments;
CREATE TRIGGER collaborator_payments_sync_paid_total
AFTER INSERT OR UPDATE OR DELETE ON public.collaborator_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_event_collaborator_paid_total();

-- Remove trigger antigo que só atualizava paid_value genérico
DROP TRIGGER IF EXISTS collaborator_payments_sync_paid_value_insert ON public.collaborator_payments;
DROP TRIGGER IF EXISTS collaborator_payments_sync_paid_value_update ON public.collaborator_payments;
DROP TRIGGER IF EXISTS collaborator_payments_sync_paid_value_delete ON public.collaborator_payments;