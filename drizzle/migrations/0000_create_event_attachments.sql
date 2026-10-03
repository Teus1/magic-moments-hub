CREATE TYPE public.event_attachment_category AS ENUM ('receipt', 'document');

CREATE TABLE public.event_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category public.event_attachment_category NOT NULL,
  original_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 20971520),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.event_attachments TO authenticated;
GRANT ALL ON public.event_attachments TO service_role;

ALTER TABLE public.event_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_attachments_view
ON public.event_attachments FOR SELECT TO authenticated
USING (public.can('events', 'view'));

CREATE POLICY event_attachments_create
ON public.event_attachments FOR INSERT TO authenticated
WITH CHECK (public.can('events', 'create') OR public.can('events', 'edit'));

CREATE POLICY event_attachments_delete
ON public.event_attachments FOR DELETE TO authenticated
USING (public.can('events', 'edit'));

CREATE INDEX event_attachments_event_id_idx ON public.event_attachments(event_id);

CREATE POLICY event_attachment_files_view
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'event-attachments' AND public.can('events', 'view'));

CREATE POLICY event_attachment_files_create
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-attachments' AND (public.can('events', 'create') OR public.can('events', 'edit')));

CREATE POLICY event_attachment_files_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-attachments' AND public.can('events', 'edit'));