CREATE TABLE public.collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  nickname text,
  phone text,
  whatsapp text,
  email text,
  role_title text,
  notes text,
  status public.record_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborators TO authenticated;
GRANT ALL ON public.collaborators TO service_role;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY collaborators_view ON public.collaborators FOR SELECT TO authenticated USING (public.can('collaborators','view'));
CREATE POLICY collaborators_create ON public.collaborators FOR INSERT TO authenticated WITH CHECK (public.can('collaborators','create'));
CREATE POLICY collaborators_edit ON public.collaborators FOR UPDATE TO authenticated USING (public.can('collaborators','edit')) WITH CHECK (public.can('collaborators','edit'));
CREATE POLICY collaborators_delete ON public.collaborators FOR DELETE TO authenticated USING (public.can('collaborators','delete'));

CREATE TRIGGER collaborators_updated_at BEFORE UPDATE ON public.collaborators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.event_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  role_title text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, collaborator_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_collaborators TO authenticated;
GRANT ALL ON public.event_collaborators TO service_role;
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_collaborators_view ON public.event_collaborators FOR SELECT TO authenticated USING (public.can('events','view'));
CREATE POLICY event_collaborators_create ON public.event_collaborators FOR INSERT TO authenticated WITH CHECK (public.can('events','edit'));
CREATE POLICY event_collaborators_edit ON public.event_collaborators FOR UPDATE TO authenticated USING (public.can('events','edit')) WITH CHECK (public.can('events','edit'));
CREATE POLICY event_collaborators_delete ON public.event_collaborators FOR DELETE TO authenticated USING (public.can('events','edit'));

CREATE TRIGGER event_collaborators_updated_at BEFORE UPDATE ON public.event_collaborators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.permissions (module, action, label, sort_order) VALUES
  ('collaborators','view','Visualizar colaboradores',10),
  ('collaborators','create','Criar colaboradores',20),
  ('collaborators','edit','Editar colaboradores',30),
  ('collaborators','delete','Excluir colaboradores',40);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'administrador' AND p.module = 'collaborators'
ON CONFLICT DO NOTHING;