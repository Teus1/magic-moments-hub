CREATE TABLE public.calendar_appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
 start_at timestamp without time zone NOT NULL,
 end_at timestamp without time zone NOT NULL,
 venue text NOT NULL DEFAULT '',
 observations text NOT NULL DEFAULT '',
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT calendar_appointments_time_order CHECK (end_at > start_at)
);
COMMENT ON COLUMN public.calendar_appointments.start_at IS 'Operational local wall time in America/Sao_Paulo; not UTC.';
COMMENT ON COLUMN public.calendar_appointments.end_at IS 'Operational local wall time in America/Sao_Paulo; not UTC.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_appointments TO authenticated;
GRANT ALL ON public.calendar_appointments TO service_role;
ALTER TABLE public.calendar_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_appointments_view ON public.calendar_appointments FOR SELECT TO authenticated USING (public.can('calendar','view') AND public.can('events','view') AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id));
CREATE POLICY calendar_appointments_create ON public.calendar_appointments FOR INSERT TO authenticated WITH CHECK (public.can('calendar','view') AND public.can('events','view') AND public.can('events','create') AND created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id));
CREATE POLICY calendar_appointments_edit ON public.calendar_appointments FOR UPDATE TO authenticated USING (public.can('calendar','view') AND public.can('events','view') AND public.can('events','edit')) WITH CHECK (public.can('calendar','view') AND public.can('events','view') AND public.can('events','edit') AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id));
CREATE POLICY calendar_appointments_delete ON public.calendar_appointments FOR DELETE TO authenticated USING (public.can('calendar','view') AND public.can('events','view') AND public.can('events','delete'));
CREATE INDEX calendar_appointments_start_end_idx ON public.calendar_appointments(start_at, end_at);
CREATE INDEX calendar_appointments_event_idx ON public.calendar_appointments(event_id);
CREATE TRIGGER calendar_appointments_updated_at BEFORE UPDATE ON public.calendar_appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();