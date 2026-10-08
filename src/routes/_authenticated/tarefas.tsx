import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { TaskBoard } from "@/components/task-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PickerField } from "@/components/ui/picker-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { saveTask, changeTaskStatus, deleteTask } from "@/lib/tasks.functions";
import { loadTasks, loadTaskOptions, taskQueryKey, type Task, type TaskCategory, type TaskStatus } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [
    { title: "Tarefas — Magic Moments" },
    { name: "description", content: "Tarefas internas e acompanhamento de validação de artes para clientes Magic Moments." },
    { property: "og:title", content: "Tarefas — Magic Moments" },
    { property: "og:description", content: "Quadros de validação de artes e atividades da equipe Magic Moments." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: TasksPage,
});

type Draft = { title: string; description: string; observations: string; client_id: string; assignee_id: string; due_date: string; status: TaskStatus };
const emptyDraft = (): Draft => ({ title: "", description: "", observations: "", client_id: "", assignee_id: "", due_date: "", status: "pending" });
const message = (error: unknown) => error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "Não foi possível salvar. Tente novamente.";

function TasksPage() {
  const { can, user, isLoading: userLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const saveTaskFn = useServerFn(saveTask);
  const changeStatusFn = useServerFn(changeTaskStatus);
  const deleteTaskFn = useServerFn(deleteTask);
  const canView = can("tasks", "view"), canCreate = can("tasks", "create"), canEdit = can("tasks", "edit"), canDelete = can("tasks", "delete");
  const tasks = useQuery({ queryKey: taskQueryKey, queryFn: loadTasks, enabled: canView });
  const options = useQuery({ queryKey: ["task-options"], queryFn: loadTaskOptions, enabled: canView });
  const [category, setCategory] = useState<TaskCategory>("art");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const clients = new Map((options.data?.clients ?? []).map((item) => [item.id, item.full_name]));
  const assignees = new Map((options.data?.assignees ?? []).map((item) => [item.id, item.name]));
  const editable = editing ? canEdit : canCreate;

  const save = useMutation({ mutationFn: async () => {
    if (!user || !editable) throw new Error("Sem permissão para salvar tarefas.");
    if (!draft.title.trim()) throw new Error("Informe o título da tarefa.");
    if (category === "art" && !draft.client_id) throw new Error("Selecione o cliente da validação de arte.");
    const payload = { category, status: draft.status, title: draft.title.trim(), description: draft.description.trim(), observations: draft.observations.trim(), client_id: draft.client_id || null, assignee_id: draft.assignee_id || null, due_date: draft.due_date || null };
    await saveTaskFn({ data: { id: editing?.id ?? null, draft: payload } });
  }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: taskQueryKey }); setOpen(false); }, onError: (cause) => setFormError(message(cause)) });

  const move = useMutation({ mutationFn: async ({ task, status }: { task: Task; status: TaskStatus }) => {
    if (!canEdit) throw new Error("Sem permissão para editar tarefas.");
    await changeStatusFn({ data: { id: task.id, status } });
  }, onMutate: async ({ task, status }) => {
    setError(""); await queryClient.cancelQueries({ queryKey: taskQueryKey });
    const previous = queryClient.getQueryData<Task[]>(taskQueryKey);
    queryClient.setQueryData<Task[]>(taskQueryKey, (rows) => rows?.map((row) => row.id === task.id ? { ...row, status } : row));
    return { previous };
  }, onError: (cause, _, context) => { if (context?.previous) queryClient.setQueryData(taskQueryKey, context.previous); setError(message(cause)); }, onSettled: () => queryClient.invalidateQueries({ queryKey: taskQueryKey }) });

  const remove = useMutation({ mutationFn: async () => {
    if (!deleting || !canDelete) throw new Error("Sem permissão para excluir esta tarefa.");
    await deleteTaskFn({ data: { id: deleting.id } });
  }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: taskQueryKey }); setDeleting(null); setOpen(false); }, onError: (cause) => setError(message(cause)) });

  function openTask(task: Task | null) {
    setEditing(task); setFormError("");
    setDraft(task ? { title: task.title, description: task.description, observations: task.observations, client_id: task.client_id ?? "", assignee_id: task.assignee_id ?? "", due_date: task.due_date ?? "", status: task.status === "completed" ? "completed" : "pending" } : emptyDraft());
    setOpen(true);
  }
  const filtered = (tasks.data ?? []).filter((task) => task.category === category && (clientFilter === "all" || task.client_id === clientFilter) && (assigneeFilter === "all" || (assigneeFilter === "none" ? !task.assignee_id : task.assignee_id === assigneeFilter)) && `${task.title} ${task.description} ${task.observations} ${clients.get(task.client_id ?? "") ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const field = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  if (userLoading) return <AppShell><PageHeader title="Tarefas" /><LoaderCircle className="size-5 animate-spin text-primary" /></AppShell>;
  if (!canView) return <AppShell><PageHeader title="Tarefas" /><p className="text-muted-foreground">Você não tem permissão para acessar tarefas.</p></AppShell>;

  return <AppShell>
    <PageHeader title="Tarefas" description="Organize as validações dos clientes e as atividades da equipe." action={canCreate ? <Button onClick={() => openTask(null)}><Plus />Nova tarefa</Button> : undefined} />
    <Tabs value={category} onValueChange={(value) => { if (value === "art" || value === "daily") { setCategory(value); setClientFilter("all"); } }} className="mb-6">
      <TabsList className="h-auto flex-wrap"><TabsTrigger value="art">Validação de artes</TabsTrigger><TabsTrigger value="daily">Dia a dia</TabsTrigger></TabsList>
    </Tabs>
    <div className="mb-7 flex flex-col gap-3 lg:flex-row">
      <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input aria-label="Buscar tarefas" placeholder="Buscar tarefas…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
      {category === "art" && <Select value={clientFilter} onValueChange={setClientFilter}><SelectTrigger aria-label="Filtrar por cliente" className="w-full lg:w-60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{options.data?.clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>)}</SelectContent></Select>}
      <Select value={assigneeFilter} onValueChange={setAssigneeFilter}><SelectTrigger aria-label="Filtrar por responsável" className="w-full lg:w-60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem><SelectItem value="none">Sem responsável</SelectItem>{options.data?.assignees.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent></Select>
    </div>
    {(error || tasks.error || options.error) && <div role="alert" className="mb-5 space-y-2 text-sm text-destructive"><p>{error || message(tasks.error ?? options.error)}</p>{(tasks.error || options.error) && <Button variant="outline" size="sm" onClick={() => { void tasks.refetch(); void options.refetch(); }}>Tentar novamente</Button>}</div>}
    {tasks.isLoading || options.isLoading ? <p role="status" className="flex items-center gap-2 py-10 text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Carregando tarefas…</p> : <TaskBoard tasks={filtered} clients={clients} assignees={assignees} canEdit={canEdit} busy={move.isPending || save.isPending || remove.isPending} onOpen={openTask} onMove={(task, status) => move.mutate({ task, status })} />}
    <Dialog open={open} onOpenChange={(value) => { if (!save.isPending && !remove.isPending) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" />{editing ? "Tarefa" : "Nova tarefa"}</DialogTitle><DialogDescription>{category === "art" ? "Validação de artes" : "Dia a dia"}</DialogDescription></DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); setFormError(""); save.mutate(); }} className="space-y-4">
          <fieldset disabled={!editable || save.isPending} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="task-title">Título <span className="text-destructive">*</span></Label><Input id="task-title" required maxLength={200} value={draft.title} onChange={(event) => field("title", event.target.value)} /></div>
            {category === "art" && <div className="space-y-2"><Label>Cliente <span className="text-destructive">*</span></Label><Select value={draft.client_id || "none"} onValueChange={(value) => field("client_id", value === "none" ? "" : value)} disabled={!editable || save.isPending}><SelectTrigger aria-label="Cliente da tarefa"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Selecione o cliente</SelectItem>{options.data?.clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>)}</SelectContent></Select></div>}
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Responsável</Label><Select value={draft.assignee_id || "none"} onValueChange={(value) => field("assignee_id", value === "none" ? "" : value)} disabled={!editable || save.isPending}><SelectTrigger aria-label="Responsável da tarefa"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem responsável</SelectItem>{options.data?.assignees.filter((person) => person.active || person.id === draft.assignee_id).map((person) => <SelectItem key={person.id} value={person.id}>{person.name}{!person.active ? " (inativo)" : ""}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="task-due">Prazo</Label><PickerField id="task-due" variant="date" value={draft.due_date} onChange={(event) => field("due_date", event.target.value)} /></div></div>
            <div className="space-y-2"><Label htmlFor="task-description">Descrição</Label><Textarea id="task-description" rows={3} maxLength={20000} value={draft.description} onChange={(event) => field("description", event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="task-observations">Observações</Label><Textarea id="task-observations" rows={4} maxLength={20000} value={draft.observations} onChange={(event) => field("observations", event.target.value)} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={draft.status} onValueChange={(value) => { if (value === "pending" || value === "completed") field("status", value); }} disabled={!editable || save.isPending}><SelectTrigger aria-label="Status da tarefa"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></div>
          </fieldset>
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <DialogFooter className="gap-2">{editing && canDelete && <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" disabled={save.isPending} onClick={() => { setError(""); setDeleting(editing); }}><Trash2 />Excluir</Button>}<Button type="button" variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>Fechar</Button>{editable && <Button type="submit" disabled={save.isPending || options.isLoading || Boolean(options.error)}>{save.isPending && <LoaderCircle className="animate-spin" />}Salvar tarefa</Button>}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={(value) => { if (!value && !remove.isPending) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir tarefa?</AlertDialogTitle><AlertDialogDescription>“{deleting?.title}” será excluída definitivamente.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending && <LoaderCircle className="animate-spin" />}Excluir tarefa</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AppShell>;
}