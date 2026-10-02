ALTER TABLE public.collaborators
  DROP CONSTRAINT collaborators_created_by_fkey,
  ADD CONSTRAINT collaborators_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.event_collaborators
  DROP CONSTRAINT event_collaborators_created_by_fkey,
  ADD CONSTRAINT event_collaborators_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;