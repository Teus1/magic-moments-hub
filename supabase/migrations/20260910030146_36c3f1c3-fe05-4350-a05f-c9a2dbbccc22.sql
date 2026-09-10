ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS collaborators_profile_id_key ON public.collaborators(profile_id) WHERE profile_id IS NOT NULL;

ALTER TABLE public.event_collaborators
  ADD COLUMN IF NOT EXISTS agreed_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_value numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.my_collaborator_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id FROM public.collaborators c WHERE c.profile_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_scheduled_for_event(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_collaborators ec
    WHERE ec.event_id = _event_id
      AND ec.collaborator_id = public.my_collaborator_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client_of_my_events(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.event_collaborators ec ON ec.event_id = e.id
    WHERE e.client_id = _client_id
      AND ec.collaborator_id = public.my_collaborator_id()
  );
$$;

CREATE POLICY collaborators_view_self ON public.collaborators
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY event_collaborators_view_self ON public.event_collaborators
  FOR SELECT TO authenticated USING (collaborator_id = public.my_collaborator_id());

CREATE POLICY events_view_scheduled_self ON public.events
  FOR SELECT TO authenticated USING (public.is_scheduled_for_event(id));

CREATE POLICY clients_view_scheduled_self ON public.clients
  FOR SELECT TO authenticated USING (public.is_client_of_my_events(id));

CREATE POLICY services_view_active_user ON public.services
  FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

INSERT INTO public.permissions (module, action, label, sort_order)
VALUES ('portal', 'view', 'Acessar portal do colaborador', 100)
ON CONFLICT DO NOTHING;

INSERT INTO public.roles (name, slug, description, is_system)
VALUES ('Colaborador', 'colaborador', 'Acesso apenas ao portal do colaborador', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'portal' AND p.action = 'view'
WHERE r.slug IN ('administrador', 'admin', 'colaborador')
ON CONFLICT DO NOTHING;