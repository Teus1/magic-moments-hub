ALTER TABLE public.events
  ADD COLUMN has_ceremonial boolean NOT NULL DEFAULT false,
  ADD COLUMN ceremonial_name text,
  ADD COLUMN ceremonial_contact text,
  ADD COLUMN contact_via_ceremonial boolean NOT NULL DEFAULT false;