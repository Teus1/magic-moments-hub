-- Add transport responsible and value columns to event_collaborators
ALTER TABLE public.event_collaborators
  ADD COLUMN is_transport_responsible boolean NOT NULL DEFAULT false,
  ADD COLUMN transport_value numeric(10,2) DEFAULT NULL;

COMMENT ON COLUMN public.event_collaborators.is_transport_responsible IS 'Indica se este colaborador é o responsável pelo transporte do evento (recebe ajuda de combustível).';
COMMENT ON COLUMN public.event_collaborators.transport_value IS 'Valor da ajuda de combustível/deslocamento para o responsável pelo transporte.';