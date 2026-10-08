CREATE TABLE public.tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 category text NOT NULL DEFAULT 'daily' CHECK (category IN ('art','daily')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
 description text NOT NULL DEFAULT '',
 observations text NOT NULL DEFAULT '',
 client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
 assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 due_date date,
 completed_at timestamptz,
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT tasks_art_client CHECK (category <> 'art' OR client_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_view ON public.tasks FOR SELECT TO authenticated USING (public.can('tasks','view'));
CREATE POLICY tasks_create ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.can('tasks','create') AND created_by = auth.uid());
CREATE POLICY tasks_edit ON public.tasks FOR UPDATE TO authenticated USING (public.can('tasks','edit')) WITH CHECK (public.can('tasks','edit'));
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated USING (public.can('tasks','delete'));
CREATE INDEX tasks_category_status_idx ON public.tasks(category,status);
CREATE INDEX tasks_client_idx ON public.tasks(client_id);
CREATE INDEX tasks_assignee_idx ON public.tasks(assignee_id);
CREATE OR REPLACE FUNCTION public.update_task_metadata() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.updated_at = now();
 IF NEW.status = 'completed' THEN
  IF TG_OP = 'INSERT' THEN NEW.completed_at = now();
  ELSIF OLD.status <> 'completed' THEN NEW.completed_at = now();
  ELSE NEW.completed_at = OLD.completed_at; END IF;
 ELSE NEW.completed_at = NULL; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER tasks_metadata BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_task_metadata();
CREATE OR REPLACE FUNCTION public.task_client_options() RETURNS TABLE(id uuid, full_name text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT (public.can('tasks','view') OR public.can('tasks','create') OR public.can('tasks','edit')) THEN RAISE EXCEPTION 'Sem permissão para acessar clientes de tarefas'; END IF;
 RETURN QUERY SELECT c.id, c.full_name FROM public.clients c ORDER BY c.full_name;
END;
$$;
REVOKE ALL ON FUNCTION public.task_client_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.task_client_options() TO authenticated;
CREATE OR REPLACE FUNCTION public.task_assignee_options() RETURNS TABLE(id uuid, name text, active boolean) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT (public.can('tasks','view') OR public.can('tasks','create') OR public.can('tasks','edit')) THEN RAISE EXCEPTION 'Sem permissão para acessar responsáveis de tarefas'; END IF;
 RETURN QUERY SELECT p.id, p.name, p.status = 'active' FROM public.profiles p JOIN public.roles r ON r.id = p.role_id
 WHERE r.slug <> 'colaborador' OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.assignee_id = p.id) ORDER BY p.name;
END;
$$;
REVOKE ALL ON FUNCTION public.task_assignee_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.task_assignee_options() TO authenticated;