-- Add share_url column to store the full intake link for later retrieval
ALTER TABLE public.client_preregistrations
  ADD COLUMN share_url text;

COMMENT ON COLUMN public.client_preregistrations.share_url IS 'Full URL for the intake form (e.g., https://gerenciadormagicmoments.app/f/{token}), stored at creation time for later reference.';