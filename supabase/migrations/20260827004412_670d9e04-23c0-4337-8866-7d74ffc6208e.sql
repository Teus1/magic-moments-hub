-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.user_status AS ENUM ('active', 'inactive');
CREATE TYPE public.event_status AS ENUM ('lead', 'confirmed', 'done', 'cancelled');
CREATE TYPE public.record_status AS ENUM ('active', 'inactive');

-- =========================
-- UTIL
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- ROLES
-- =========================
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- PERMISSIONS CATALOG (module -> action)
-- =========================
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, action)
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Prepared for future field-level permissions
CREATE TABLE public.role_field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  field text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, module, field)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_field_permissions TO authenticated;
GRANT ALL ON public.role_field_permissions TO service_role;
ALTER TABLE public.role_field_permissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER role_field_permissions_updated_at BEFORE UPDATE ON public.role_field_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  email text,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  status public.user_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- CORE SECURITY FUNCTIONS
-- =========================
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.role_permissions rp ON rp.role_id = p.role_id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = _user_id
      AND p.status = 'active'
      AND perm.module = _module
      AND perm.action = _action
  );
$$;

CREATE OR REPLACE FUNCTION public.can(_module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_permission(auth.uid(), _module, _action);
$$;

-- =========================
-- POLICIES: roles / permissions
-- =========================
CREATE POLICY "roles_select_authenticated" ON public.roles
FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE POLICY "roles_manage" ON public.roles
FOR ALL TO authenticated
USING (public.can('roles', 'manage'))
WITH CHECK (public.can('roles', 'manage'));

CREATE POLICY "permissions_select" ON public.permissions
FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE POLICY "role_permissions_select" ON public.role_permissions
FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE POLICY "role_permissions_manage" ON public.role_permissions
FOR ALL TO authenticated
USING (public.can('roles', 'manage'))
WITH CHECK (public.can('roles', 'manage'));

CREATE POLICY "role_field_permissions_select" ON public.role_field_permissions
FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE POLICY "role_field_permissions_manage" ON public.role_field_permissions
FOR ALL TO authenticated
USING (public.can('roles', 'manage'))
WITH CHECK (public.can('roles', 'manage'));

-- =========================
-- POLICIES: profiles
-- =========================
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_select_with_permission" ON public.profiles
FOR SELECT TO authenticated USING (public.can('users', 'view'));

CREATE POLICY "profiles_insert_with_permission" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (public.can('users', 'create'));

CREATE POLICY "profiles_update_with_permission" ON public.profiles
FOR UPDATE TO authenticated
USING (public.can('users', 'edit'))
WITH CHECK (public.can('users', 'edit'));

-- =========================
-- FUTURE MODULES (structure only)
-- =========================
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  whatsapp text,
  email text,
  zip_code text,
  address text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "clients_view" ON public.clients FOR SELECT TO authenticated USING (public.can('clients','view'));
CREATE POLICY "clients_create" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.can('clients','create'));
CREATE POLICY "clients_edit" ON public.clients FOR UPDATE TO authenticated USING (public.can('clients','edit')) WITH CHECK (public.can('clients','edit'));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (public.can('clients','delete'));

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#6335A7',
  status public.record_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "services_view" ON public.services FOR SELECT TO authenticated USING (public.can('services','view'));
CREATE POLICY "services_create" ON public.services FOR INSERT TO authenticated WITH CHECK (public.can('services','create'));
CREATE POLICY "services_edit" ON public.services FOR UPDATE TO authenticated USING (public.can('services','edit')) WITH CHECK (public.can('services','edit'));
CREATE POLICY "services_delete" ON public.services FOR DELETE TO authenticated USING (public.can('services','delete'));

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name text NOT NULL,
  event_type text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  venue text,
  address text,
  status public.event_status NOT NULL DEFAULT 'lead',
  contracted_value numeric(12,2) NOT NULL DEFAULT 0,
  received_value numeric(12,2) NOT NULL DEFAULT 0,
  balance_value numeric(12,2) GENERATED ALWAYS AS (contracted_value - received_value) STORED,
  notes text,
  responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "events_view" ON public.events FOR SELECT TO authenticated USING (public.can('events','view'));
CREATE POLICY "events_create" ON public.events FOR INSERT TO authenticated WITH CHECK (public.can('events','create'));
CREATE POLICY "events_edit" ON public.events FOR UPDATE TO authenticated USING (public.can('events','edit')) WITH CHECK (public.can('events','edit'));
CREATE POLICY "events_delete" ON public.events FOR DELETE TO authenticated USING (public.can('events','delete'));

-- =========================
-- SEED: permissions catalog
-- =========================
INSERT INTO public.permissions (module, action, label, sort_order) VALUES
  ('dashboard','view','Visualizar dashboard',10),
  ('clients','view','Visualizar clientes',20),
  ('clients','create','Criar clientes',21),
  ('clients','edit','Editar clientes',22),
  ('clients','delete','Excluir clientes',23),
  ('events','view','Visualizar eventos',30),
  ('events','create','Criar eventos',31),
  ('events','edit','Editar eventos',32),
  ('events','delete','Excluir eventos',33),
  ('events','edit_values','Editar valores do evento',34),
  ('events','edit_critical','Editar informações críticas do evento',35),
  ('calendar','view','Visualizar calendário',40),
  ('calendar','create','Criar no calendário',41),
  ('calendar','edit','Editar no calendário',42),
  ('calendar','delete','Excluir no calendário',43),
  ('services','view','Visualizar serviços',50),
  ('services','create','Criar serviços',51),
  ('services','edit','Editar serviços',52),
  ('services','delete','Excluir serviços',53),
  ('users','view','Visualizar usuários',60),
  ('users','create','Criar usuários',61),
  ('users','edit','Editar usuários',62),
  ('users','deactivate','Desativar usuários',63),
  ('roles','manage','Gerenciar papéis e permissões',70),
  ('settings','view','Visualizar configurações',80),
  ('settings','edit','Editar configurações',81);

-- =========================
-- SEED: roles
-- =========================
INSERT INTO public.roles (name, slug, description, is_system) VALUES
  ('Administrador','administrador','Acesso completo ao sistema', true),
  ('Comercial','comercial','Equipe comercial: clientes, eventos e calendário', false);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'administrador';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON true
WHERE r.slug = 'comercial'
  AND (
    (p.module = 'dashboard' AND p.action = 'view') OR
    (p.module = 'clients' AND p.action IN ('view','create','edit')) OR
    (p.module = 'events' AND p.action IN ('view','create','edit')) OR
    (p.module = 'calendar' AND p.action IN ('view','create','edit')) OR
    (p.module = 'services' AND p.action = 'view')
  );

-- Field-level example scaffolding for the Comercial role (financial fields read-only)
INSERT INTO public.role_field_permissions (role_id, module, field, can_view, can_edit)
SELECT r.id, 'events', f.field, true, false
FROM public.roles r
CROSS JOIN (VALUES ('contracted_value'), ('received_value')) AS f(field)
WHERE r.slug = 'comercial';