ALTER TABLE public.events DROP COLUMN IF EXISTS responsible_id;

CREATE TYPE public.event_status_new AS ENUM ('planned', 'cancelled');

ALTER TABLE public.events ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.events
  ALTER COLUMN status TYPE public.event_status_new
  USING (CASE WHEN status::text = 'cancelled' THEN 'cancelled' ELSE 'planned' END)::public.event_status_new;

DROP TYPE public.event_status;

ALTER TYPE public.event_status_new RENAME TO event_status;

ALTER TABLE public.events ALTER COLUMN status SET DEFAULT 'planned'::public.event_status;