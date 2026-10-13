CREATE TABLE public.attractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 150),
  description text CHECK (description IS NULL OR length(description) <= 1000),
  status public.record_status NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.attractions TO authenticated;
GRANT ALL ON public.attractions TO service_role;
ALTER TABLE public.attractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attractions read" ON public.attractions FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "attractions insert" ON public.attractions FOR INSERT TO authenticated WITH CHECK (public.can('settings','edit'));
CREATE POLICY "attractions update" ON public.attractions FOR UPDATE TO authenticated USING (public.can('settings','edit')) WITH CHECK (public.can('settings','edit'));
CREATE TRIGGER attractions_updated_at BEFORE UPDATE ON public.attractions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.whatsapp_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (phone ~ '^[0-9]{12,13}$'),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_notification_recipients TO authenticated;
GRANT ALL ON public.whatsapp_notification_recipients TO service_role;
ALTER TABLE public.whatsapp_notification_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipients read" ON public.whatsapp_notification_recipients FOR SELECT TO authenticated USING (public.can('settings','view') OR public.can('clients','view'));
CREATE POLICY "recipients insert" ON public.whatsapp_notification_recipients FOR INSERT TO authenticated WITH CHECK (public.can('settings','edit'));
CREATE POLICY "recipients update" ON public.whatsapp_notification_recipients FOR UPDATE TO authenticated USING (public.can('settings','edit')) WITH CHECK (public.can('settings','edit'));
CREATE POLICY "recipients delete" ON public.whatsapp_notification_recipients FOR DELETE TO authenticated USING (public.can('settings','edit'));
CREATE TRIGGER recipients_updated_at BEFORE UPDATE ON public.whatsapp_notification_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.events ADD COLUMN attraction_id uuid REFERENCES public.attractions(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN attraction_start_location text CHECK (attraction_start_location IS NULL OR length(attraction_start_location) <= 300);
ALTER TABLE public.client_preregistrations ADD COLUMN notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.submit_client_preregistration(_hash text, _payload jsonb)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.client_preregistrations; e jsonb;
BEGIN
 SELECT * INTO p FROM public.client_preregistrations WHERE token_hash=_hash FOR UPDATE;
 IF p.id IS NULL OR p.expires_at <= now() THEN RAISE EXCEPTION 'Link inválido ou expirado'; END IF;
 IF p.status <> 'pending' THEN RETURN 'already_received'; END IF;
 IF jsonb_typeof(_payload)<>'object' OR octet_length(_payload::text)>20000 OR length(trim(_payload->>'full_name'))<2 OR length(_payload->>'full_name')>150 OR length(_payload->>'event_title')<2 OR length(_payload->>'event_title')>200 OR length(_payload->>'cpf')<>11 OR (_payload->>'cpf')!~'^[0-9]{11}$' OR length(_payload->>'whatsapp') NOT IN (10,11) OR length(_payload->>'notes')>5000 THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
 e := _payload->'event';
 IF e IS NOT NULL THEN
  IF jsonb_typeof(e)<>'object' OR length(coalesce(e->>'venue',''))>300 OR length(coalesce(e->>'address',''))>500 OR length(coalesce(e->>'attraction_start_location',''))>300 OR length(coalesce(e->>'ceremonial_name',''))>150 OR length(coalesce(e->>'ceremonial_contact',''))>150
   OR (coalesce(e->>'duration_minutes','') <> '' AND ((e->>'duration_minutes')!~'^[0-9]{1,4}$' OR (e->>'duration_minutes')::int NOT BETWEEN 1 AND 1439))
   OR (coalesce(e->>'start_time','') <> '' AND (e->>'start_time')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$')
   OR (coalesce(e->>'attraction_id','') <> '' AND NOT EXISTS(SELECT 1 FROM public.attractions a WHERE a.id::text=e->>'attraction_id' AND a.status='active'))
  THEN RAISE EXCEPTION 'Dados do evento inválidos'; END IF;
 END IF;
 UPDATE public.client_preregistrations SET payload=_payload,status='received',received_at=now() WHERE id=p.id;
 RETURN 'received';
END $function$;