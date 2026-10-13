CREATE TABLE public.travel_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  base_address text NOT NULL DEFAULT '',
  efficiency_km_l numeric NOT NULL DEFAULT 10 CHECK (efficiency_km_l > 0),
  fuel_price numeric NOT NULL DEFAULT 6 CHECK (fuel_price >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.travel_settings TO authenticated;
GRANT ALL ON public.travel_settings TO service_role;
ALTER TABLE public.travel_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel settings read" ON public.travel_settings FOR SELECT TO authenticated USING (public.can('events','view') OR public.can('settings','view'));
CREATE POLICY "travel settings insert" ON public.travel_settings FOR INSERT TO authenticated WITH CHECK (public.can('settings','edit'));
CREATE POLICY "travel settings update" ON public.travel_settings FOR UPDATE TO authenticated USING (public.can('settings','edit')) WITH CHECK (public.can('settings','edit'));

CREATE TABLE public.event_travel_estimates (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  distance_km numeric NOT NULL,
  duration_seconds integer NOT NULL,
  toll numeric,
  manual_toll numeric CHECK (manual_toll IS NULL OR manual_toll >= 0),
  calculated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_travel_estimates TO authenticated;
GRANT ALL ON public.event_travel_estimates TO service_role;
ALTER TABLE public.event_travel_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimates read" ON public.event_travel_estimates FOR SELECT TO authenticated USING (public.can('events','view'));
CREATE POLICY "estimates insert" ON public.event_travel_estimates FOR INSERT TO authenticated WITH CHECK (public.can('events','view'));
CREATE POLICY "estimates update" ON public.event_travel_estimates FOR UPDATE TO authenticated USING (public.can('events','view')) WITH CHECK (public.can('events','view'));
CREATE POLICY "estimates delete" ON public.event_travel_estimates FOR DELETE TO authenticated USING (public.can('events','view'));

COMMENT ON TABLE public.attractions IS 'DEPRECATED: attractions now come from services';
COMMENT ON COLUMN public.events.attraction_id IS 'DEPRECATED: use service_id';
COMMENT ON COLUMN public.events.attraction_start_location IS 'DEPRECATED: no longer shown';