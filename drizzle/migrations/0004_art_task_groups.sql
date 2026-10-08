CREATE TABLE public.task_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
 event_date date,
 assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 observations text NOT NULL DEFAULT '',
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_groups TO authenticated;
GRANT ALL ON public.task_groups TO service_role;
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_groups_view ON public.task_groups FOR SELECT TO authenticated USING (public.can('tasks','view'));
CREATE POLICY task_groups_create ON public.task_groups FOR INSERT TO authenticated WITH CHECK (public.can('tasks','create') AND created_by = auth.uid());
CREATE POLICY task_groups_edit ON public.task_groups FOR UPDATE TO authenticated USING (public.can('tasks','edit')) WITH CHECK (public.can('tasks','edit'));
CREATE POLICY task_groups_delete ON public.task_groups FOR DELETE TO authenticated USING (public.can('tasks','delete'));
CREATE TRIGGER task_groups_updated BEFORE UPDATE ON public.task_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.tasks ADD COLUMN group_id uuid REFERENCES public.task_groups(id) ON DELETE CASCADE;
CREATE INDEX tasks_group_idx ON public.tasks(group_id);
INSERT INTO public.task_groups (id,title,assignee_id,created_by,created_at) SELECT id,title,assignee_id,created_by,created_at FROM public.tasks WHERE category='art';
UPDATE public.tasks SET group_id=id WHERE category='art';
UPDATE public.tasks SET observations=concat_ws(E'\n\n',nullif(observations,''),'Descrição anterior: ' || description) WHERE description <> '';
ALTER TABLE public.tasks DROP CONSTRAINT tasks_art_client;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_group_category CHECK ((category='art' AND group_id IS NOT NULL) OR (category='daily' AND group_id IS NULL));
COMMENT ON COLUMN public.tasks.client_id IS 'DEPRECATED: tasks no longer link to clients; retained for historical compatibility';
COMMENT ON COLUMN public.tasks.description IS 'DEPRECATED: content preserved in observations';
COMMENT ON COLUMN public.tasks.due_date IS 'DEPRECATED: art subtasks reference task_groups.event_date; daily tasks have no deadline';