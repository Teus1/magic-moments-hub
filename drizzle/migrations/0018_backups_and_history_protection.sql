ALTER TABLE public.event_collaborators DROP CONSTRAINT event_collaborators_event_id_fkey, ADD CONSTRAINT event_collaborators_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT;
ALTER TABLE public.event_collaborators DROP CONSTRAINT event_collaborators_collaborator_id_fkey, ADD CONSTRAINT event_collaborators_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES public.collaborators(id) ON DELETE RESTRICT;
ALTER TABLE public.event_attachments DROP CONSTRAINT event_attachments_event_id_fkey, ADD CONSTRAINT event_attachments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT;
ALTER TABLE public.event_payments DROP CONSTRAINT event_payments_event_id_fkey, ADD CONSTRAINT event_payments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT;
ALTER TABLE public.calendar_appointments DROP CONSTRAINT calendar_appointments_event_id_fkey, ADD CONSTRAINT calendar_appointments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT;
ALTER TABLE public.event_travel_estimates DROP CONSTRAINT event_travel_estimates_event_id_fkey, ADD CONSTRAINT event_travel_estimates_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT;

CREATE TABLE public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL DEFAULT 'scheduled',
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  folder_id text,
  folder_url text,
  table_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments_count integer NOT NULL DEFAULT 0,
  error text,
  requested_by uuid
);
GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view backups" ON public.backup_runs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() AND r.slug = 'administrador' AND p.status = 'active'));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;