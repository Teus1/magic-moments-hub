DROP POLICY event_attachment_files_delete ON storage.objects;
CREATE POLICY event_attachment_files_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-attachments' AND (public.can('events', 'edit') OR public.can('events', 'delete')));

DROP POLICY event_attachments_delete ON public.event_attachments;
CREATE POLICY event_attachments_delete
ON public.event_attachments FOR DELETE TO authenticated
USING (public.can('events', 'edit') OR public.can('events', 'delete'));