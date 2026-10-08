import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, ClipboardList, LoaderCircle, Plus, RotateCcw, Search, Trash2, Pencil } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { TaskBoard } from "@/components/task-board";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PickerField } from "@/components/ui/picker-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { saveTask, saveTaskGroup, changeTaskStatus, deleteTask } from "@/lib/tasks.functions";
import { loadTasks, loadTaskGroups, loadTaskOptions, taskQueryKey, groupQueryKey, groupProgress, taskDate, type Task, type TaskGroup, type TaskCategory, type TaskStatus, type BoardItem } from "@/lib/tasks";
export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [
    { title: "Tarefas — Magic Moments" },
    { name: "description", content: "Validação de artes organizada por evento e tarefas internas da Magic Moments." },
    { property: "og:title", content: "Tarefas — Magic Moments" },
    { property: "og:description", content: "Tarefas principais, subtarefas de artes e atividades da equipe Magic Moments." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: TasksPage,
});
type Editor = { kind: "group" | "task"; id: string | null; category: TaskCategory; groupId: string | null };
type Draft = { title: string; observations: string; assignee_id: string; event_date: string; status: TaskStatus };
const emptyDraft = (): Draft => ({ title: "", observations: "", assignee_id: "", event_date: "", status: "pending" });
const message = (error: unknown) => error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "Não foi possível salvar. Tente novamente.";
function TasksPage() {
  const { can, isLoading: userLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const saveTaskFn = useServerFn(saveTask), saveGroupFn = useServerFn(saveTaskGroup), changeStatusFn = useServerFn(changeTaskStatus), deleteFn = useServerFn(deleteTask);
  const canView = can("tasks", "view"), canCreate = can("tasks", "create"), canEdit = can("tasks", "edit"), canDelete = can("tasks", "delete");
  const tasks = useQuery({ queryKey: taskQueryKey, queryFn: loadTasks, enabled: canView });
  const groups = useQuery({ queryKey: groupQueryKey, queryFn: loadTaskGroups, enabled: canView });
  const options = useQuery({ queryKey: ["task-options"], queryFn: loadTaskOptions, enabled: canView });
  const [category, setCategory] = useState<TaskCategory>("art"), [search, setSearch] = useState(""), [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dateOrder, setDateOrder] = useState<"asc" | "desc">("asc");
  const [editor, setEditor] = useState<Editor | null>(null), [draft, setDraft] = useState<Draft>(emptyDraft);
  const [deleting, setDeleting] = useState<{ kind: "group" | "task"; id: string; title: string } | null>(null);
  const [error, setError] = useState(""), [formError, setFormError] = useState("");
  const assignees = new Map((options.data?.assignees ?? []).map((person) => [person.id, person.name]));
  const activeGroup = groups.data?.find((group) => group.id === selectedGroup);
  const children = (tasks.data ?? []).filter((task) => task.group_id === selectedGroup);
  const editable = editor?.id ? canEdit : canCreate;
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: taskQueryKey }), queryClient.invalidateQueries({ queryKey: groupQueryKey })]);
  const save = useMutation({ mutationFn: async () => {
    if (!editor || !editable) throw new Error("Sem permissão para salvar tarefas.");
    if (!draft.title.trim()) throw new Error("Informe o título.");
    const fields = { title: draft.title, observations: draft.observations, assignee_id: draft.assignee_id || null };
    if (editor.kind === "group") {
      if (!draft.event_date) throw new Error("Informe a data do evento.");
      return { kind: "group", ...(await saveGroupFn({ data: { id: editor.id, draft: { ...fields, event_date: draft.event_date } } })) };
    }
    return { kind: "task", ...(await saveTaskFn({ data: { id: editor.id, draft: { ...fields, category: editor.category, group_id: editor.groupId, status: draft.status } } })) };
  }, onSuccess: async (result) => { await refresh(); setEditor(null); if (result.kind === "group") setSelectedGroup(result.id); }, onError: (cause) => setFormError(message(cause)) });
  const move = useMutation({ mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => changeStatusFn({ data: { id, status } }),
    onMutate: async ({ id, status }) => { setError(""); await queryClient.cancelQueries({ queryKey: taskQueryKey }); const previous = queryClient.getQueryData<Task[]>(taskQueryKey); queryClient.setQueryData<Task[]>(taskQueryKey, (rows) => rows?.map((row) => row.id === id ? { ...row, status } : row)); return { previous }; },
    onError: (cause, _, context) => { if (context?.previous) queryClient.setQueryData(taskQueryKey, context.previous); setError(message(cause)); }, onSettled: refresh });
  const remove = useMutation({ mutationFn: async () => { if (!deleting) throw new Error("Selecione a tarefa."); return deleteFn({ data: { id: deleting.id, kind: deleting.kind } }); },
    onSuccess: async () => { const deleted = deleting; await refresh(); setDeleting(null); if (deleted?.kind === "group") setSelectedGroup(null); if (editor?.id === deleted?.id) setEditor(null); }, onError: (cause) => setError(message(cause)) });
  const busy = save.isPending || move.isPending || remove.isPending;
  function openGroup(group?: TaskGroup) {
    setFormError(""); setEditor({ kind: "group", id: group?.id ?? null, category: "art", groupId: null });
    setDraft(group ? { title: group.title, observations: group.observations, assignee_id: group.assignee_id ?? "", event_date: group.event_date ?? "", status: "pending" } : emptyDraft());
  }
  function openTask(task?: Task) {
    setFormError(""); setEditor({ kind: "task", id: task?.id ?? null, category: task?.category === "art" ? "art" : task ? "daily" : category, groupId: task?.group_id ?? (category === "art" ? selectedGroup : null) });
    setDraft(task ? { title: task.title, observations: task.observations, assignee_id: task.assignee_id ?? "", event_date: "", status: task.status === "completed" ? "completed" : "pending" } : emptyDraft());
  }
  const matchesAssignee = (id: string | null) => assigneeFilter === "all" || (assigneeFilter === "none" ? !id : id === assigneeFilter);
  const matchesText = (text: string) => text.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"));
  const boardItems: (BoardItem & { created_at: string })[] = category === "art" ? (groups.data ?? []).filter((group) => {
    const sub = (tasks.data ?? []).filter((task) => task.group_id === group.id);
    return (matchesAssignee(group.assignee_id) || sub.some((task) => matchesAssignee(task.assignee_id))) && matchesText(`${group.title} ${group.observations} ${sub.map((task) => `${task.title} ${task.observations}`).join(" ")}`);
  }).map((group) => { const progress = groupProgress((tasks.data ?? []).filter((task) => task.group_id === group.id)); return { ...group, date: group.event_date, status: progress.status, progress }; })
    : (tasks.data ?? []).filter((task) => task.category === "daily" && matchesAssignee(task.assignee_id) && matchesText(`${task.title} ${task.observations}`)).map((task) => ({ ...task, date: null, status: task.status === "completed" ? "completed" : "pending" }));
  boardItems.sort((a, b) => {
    const aDate = category === "art" ? a.date : a.created_at;
    const bDate = category === "art" ? b.date : b.created_at;
    if (!aDate && !bDate) return a.title.localeCompare(b.title, "pt-BR") || a.id.localeCompare(b.id);
    if (!aDate) return 1;
    if (!bDate) return -1;
    return (dateOrder === "asc" ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate)) || a.title.localeCompare(b.title, "pt-BR") || a.id.localeCompare(b.id);
  });
  const field = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const requestDelete = (kind: "group" | "task", id: string, title: string) => { setError(""); setDeleting({ kind, id, title }); };
  if (userLoading) return <AppShell><PageHeader title="Tarefas" /><LoaderCircle className="size-5 animate-spin text-primary" /></AppShell>;
  if (!canView) return <AppShell><PageHeader title="Tarefas" /><p className="text-muted-foreground">Você não tem permissão para acessar tarefas.</p></AppShell>;
  return <AppShell>
    <PageHeader title="Tarefas" action={canCreate ? <Button onClick={() => category === "art" ? openGroup() : openTask()}><Plus />{category === "art" ? "Nova tarefa principal" : "Nova tarefa"}</Button> : undefined} />
    <Tabs value={category} onValueChange={(value) => { if (value === "art" || value === "daily") setCategory(value); }} className="mb-6"><TabsList className="h-auto flex-wrap"><TabsTrigger value="art">Validação de artes</TabsTrigger><TabsTrigger value="daily">Dia a dia</TabsTrigger></TabsList></Tabs>
    <div className="mb-7 flex flex-col gap-3 xl:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input aria-label="Buscar tarefas" placeholder="Buscar tarefas…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div><Select value={assigneeFilter} onValueChange={setAssigneeFilter}><SelectTrigger aria-label="Filtrar por responsável" className="w-full xl:w-60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem><SelectItem value="none">Sem responsável</SelectItem>{options.data?.assignees.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent></Select><Select value={dateOrder} onValueChange={(value) => { if (value === "asc" || value === "desc") setDateOrder(value); }}><SelectTrigger aria-label={category === "art" ? "Ordenar por data do evento" : "Ordenar por data de criação"} className="w-full xl:w-72"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asc">{category === "art" ? "Evento: data crescente" : "Criação: data crescente"}</SelectItem><SelectItem value="desc">{category === "art" ? "Evento: data decrescente" : "Criação: data decrescente"}</SelectItem></SelectContent></Select></div>
    {(error || tasks.error || groups.error || options.error) && <div role="alert" className="mb-5 text-sm text-destructive"><p>{error || message(tasks.error ?? groups.error ?? options.error)}</p><Button variant="outline" size="sm" onClick={() => { setError(""); void refresh(); void options.refetch(); }}>Tentar novamente</Button></div>}
    {tasks.isLoading || groups.isLoading || options.isLoading ? <p role="status" className="flex items-center gap-2 py-10 text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Carregando tarefas…</p> : <TaskBoard tasks={boardItems} assignees={assignees} canEdit={category === "daily" && canEdit} busy={busy} onOpen={(item) => { if (category === "art") setSelectedGroup(item.id); else { const task = tasks.data?.find((row) => row.id === item.id); if (task) openTask(task); } }} onMove={(item, status) => move.mutate({ id: item.id, status })} />}
    <Dialog open={Boolean(activeGroup)} onOpenChange={(open) => { if (!open && !busy) setSelectedGroup(null); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg">
        <DialogHeader><DialogTitle className="break-words pr-6">{activeGroup?.title}</DialogTitle><DialogDescription>{activeGroup?.event_date ? `Evento · ${taskDate(activeGroup.event_date)}` : "Data do evento a definir"}</DialogDescription></DialogHeader>
        {activeGroup && <>
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{groupProgress(children).completed} de {children.length} concluídas</Badge>{activeGroup.assignee_id && <span className="text-sm text-muted-foreground">{assignees.get(activeGroup.assignee_id)}</span>}<div className="ml-auto flex gap-1">{canEdit && <Button variant="ghost" size="icon" aria-label="Editar tarefa principal" title="Editar tarefa principal" disabled={busy} onClick={() => openGroup(activeGroup)}><Pencil /></Button>}{canDelete && <Button variant="ghost" size="icon" className="text-destructive" aria-label="Excluir tarefa principal" title="Excluir tarefa principal" disabled={busy} onClick={() => requestDelete("group", activeGroup.id, activeGroup.title)}><Trash2 /></Button>}</div></div>
          {activeGroup.observations && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{activeGroup.observations}</p>}
          <section className="border-t border-border pt-4"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-xl">Subtarefas</h2>{canCreate && <Button size="sm" disabled={busy} onClick={() => openTask()}><Plus />Nova subtarefa</Button>}</div>
            {children.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhuma subtarefa cadastrada.</p>}
            <div className="divide-y divide-border">{children.map((task) => <div key={task.id} className="py-4"><div className="flex items-start gap-2"><Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left font-semibold" onClick={() => openTask(task)}><span className="break-words">{task.title}</span></Button><Badge variant={task.status === "completed" ? "secondary" : "outline"}>{task.status === "completed" ? "Concluída" : "Pendente"}</Badge></div>{task.observations && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.observations}</p>}<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{task.assignee_id && <span>{assignees.get(task.assignee_id)}</span>}<span>{activeGroup.event_date ? taskDate(activeGroup.event_date) : "Data a definir"}</span>{canEdit && <Button variant="ghost" size="sm" disabled={busy} className="ml-auto text-primary" onClick={() => move.mutate({ id: task.id, status: task.status === "completed" ? "pending" : "completed" })}>{task.status === "completed" ? <RotateCcw /> : <Check />}{task.status === "completed" ? "Reabrir" : "Concluir"}</Button>}{canDelete && <Button variant="ghost" size="icon" className="size-8 text-destructive" disabled={busy} aria-label={`Excluir ${task.title}`} title="Excluir subtarefa" onClick={() => requestDelete("task", task.id, task.title)}><Trash2 /></Button>}</div></div>)}</div>
          </section>
        </>}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(editor)} onOpenChange={(open) => { if (!open && !busy) setEditor(null); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" />{editor?.kind === "group" ? (editor.id ? "Editar tarefa principal" : "Nova tarefa principal") : editor?.category === "art" ? (editor.id ? "Subtarefa" : "Nova subtarefa") : (editor?.id ? "Tarefa" : "Nova tarefa")}</DialogTitle><DialogDescription>{editor?.kind === "group" ? "Validação de artes" : editor?.category === "art" ? activeGroup?.title : "Dia a dia"}</DialogDescription></DialogHeader>
      <form onSubmit={(event) => { event.preventDefault(); setFormError(""); save.mutate(); }} className="space-y-4"><fieldset disabled={!editable || busy} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="task-title">Título <span className="text-destructive">*</span></Label><Input id="task-title" required maxLength={200} value={draft.title} onChange={(event) => field("title", event.target.value)} /></div>
        {editor?.kind === "group" && <div className="space-y-2"><Label htmlFor="task-event-date">Data do evento <span className="text-destructive">*</span></Label><PickerField id="task-event-date" variant="date" required value={draft.event_date} onChange={(event) => field("event_date", event.target.value)} /></div>}
        <div className="space-y-2"><Label>Responsável</Label><Select value={draft.assignee_id || "none"} onValueChange={(value) => field("assignee_id", value === "none" ? "" : value)} disabled={!editable || busy}><SelectTrigger aria-label="Responsável da tarefa"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem responsável</SelectItem>{options.data?.assignees.filter((person) => person.active || person.id === draft.assignee_id).map((person) => <SelectItem key={person.id} value={person.id}>{person.name}{!person.active ? " (inativo)" : ""}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="task-observations">Observações</Label><Textarea id="task-observations" rows={4} maxLength={40000} value={draft.observations} onChange={(event) => field("observations", event.target.value)} /></div>
        {editor?.kind === "task" && <div className="space-y-2"><Label>Status</Label><Select value={draft.status} onValueChange={(value) => { if (value === "pending" || value === "completed") field("status", value); }} disabled={!editable || busy}><SelectTrigger aria-label="Status da tarefa"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></div>}
      </fieldset>{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}<DialogFooter className="gap-2">{editor?.id && canDelete && <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" disabled={busy} onClick={() => requestDelete(editor.kind, editor.id ?? "", draft.title)}><Trash2 />Excluir</Button>}<Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>Fechar</Button>{editable && <Button type="submit" disabled={busy || options.isLoading || Boolean(options.error)}>{save.isPending && <LoaderCircle className="animate-spin" />}Salvar tarefa</Button>}</DialogFooter></form>
    </DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !remove.isPending) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{deleting?.kind === "group" ? "Excluir tarefa principal?" : "Excluir tarefa?"}</AlertDialogTitle><AlertDialogDescription>“{deleting?.title}” será excluída definitivamente{deleting?.kind === "group" ? ", junto com todas as suas subtarefas" : ""}.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending && <LoaderCircle className="animate-spin" />}Excluir tarefa</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AppShell>;
}
