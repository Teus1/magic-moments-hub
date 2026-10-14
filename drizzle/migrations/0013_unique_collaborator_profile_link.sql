CREATE UNIQUE INDEX collaborators_profile_id_unique
ON public.collaborators (profile_id)
WHERE profile_id IS NOT NULL;