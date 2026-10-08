import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import { CalendarDays, Check, CheckCheck, Circle, ClipboardList, GripVertical, RotateCcw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { localToday, taskDate, type BoardItem, type TaskStatus } from "@/lib/tasks";

type BoardProps = {
  tasks: BoardItem[];
  assignees: Map<string, string>;
  canEdit: boolean;
  busy: boolean;
  onOpen: (task: BoardItem) => void;
  onMove: (task: BoardItem, status: TaskStatus) => void;
};

function TaskCard({ task, assignees, canEdit, busy, onOpen, onMove }: Omit<BoardProps, "tasks"> & { task: BoardItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !canEdit || busy });
  const overdue = task.status === "pending" && task.date && task.date < localToday();
  const percentage = task.progress && task.progress.total > 0 ? Math.round(task.progress.completed / task.progress.total * 100) : 0;
  return <article ref={setNodeRef} style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
    className={cn("relative rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-card motion-reduce:transition-none", isDragging && "opacity-30")}>
    <div className="flex items-start gap-2">
      {task.progress ? <span className="min-w-0 flex-1 break-words text-base font-semibold">{task.title}</span> : <Button variant="ghost" onClick={() => onOpen(task)} className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left text-base font-semibold hover:bg-transparent hover:text-primary"><span className="break-words">{task.title}</span></Button>}
      {canEdit && <Button variant="ghost" size="icon" {...attributes} {...listeners} aria-label={`Mover ${task.title}`} title="Mover tarefa" disabled={busy} className="size-8 shrink-0 touch-none text-muted-foreground"><GripVertical /></Button>}
      {task.progress && task.status === "completed" && <Badge variant="outline" className="shrink-0 border-task-completed-border bg-task-completed text-task-completed-foreground"><Check className="size-3" />Concluída</Badge>}
    </div>
    {task.progress && <div className="mt-4 space-y-2"><div className="flex items-center justify-between gap-3 text-xs font-semibold text-primary"><span>{task.progress.completed} de {task.progress.total} concluídas</span><span className="tabular-nums">{percentage}%</span></div><progress className="task-progress block h-1.5 w-full" value={task.progress.completed} max={Math.max(1, task.progress.total)} aria-label={`Progresso de ${task.title}`} /></div>}
    {task.observations && <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.observations}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
      {task.assignee_id && <span className="flex min-w-0 items-center gap-1.5"><UserRound className="size-3.5 shrink-0" /><span className="break-words">{assignees.get(task.assignee_id) ?? "Responsável"}</span></span>}
      {task.date && <span className={cn("flex items-center gap-1.5", overdue && "font-medium text-destructive")}><CalendarDays className="size-3.5" />{taskDate(task.date)}{overdue ? " · Atrasada" : ""}</span>}
    </div>
    {task.progress && !task.date && <p className="mt-3 text-xs text-muted-foreground">Data do evento a definir</p>}
    {canEdit && <div className="mt-4 border-t border-border pt-2"><Button variant="ghost" size="sm" disabled={busy} onClick={() => onMove(task, task.status === "pending" ? "completed" : "pending")} className="text-primary">{task.status === "pending" ? <Check /> : <RotateCcw />}{task.status === "pending" ? "Concluir" : "Reabrir"}</Button></div>}
    {task.progress && <Button variant="ghost" aria-label={task.title} onClick={() => onOpen(task)} className="absolute inset-0 z-10 h-full w-full rounded-lg p-0 hover:bg-primary/5 focus-visible:ring-inset" />}
  </article>;
}

function Column({ status, children, count }: { status: TaskStatus; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const pending = status === "pending";
  return <section ref={setNodeRef} aria-label={pending ? "Tarefas pendentes" : "Tarefas concluídas"} className={cn("flex min-h-[500px] min-w-0 flex-col rounded-lg border p-4 sm:p-5", pending ? "border-task-pending-border bg-task-pending text-task-pending-foreground" : "border-task-completed-border bg-task-completed text-task-completed-foreground", isOver && "ring-2 ring-primary")}>
    <div className="mb-6 flex items-center gap-3">{pending ? <Circle className="size-4 shrink-0" /> : <CheckCheck className="size-5 shrink-0" />}<h2 className="font-display text-xl tracking-normal text-foreground">{pending ? "Pendente" : "Concluída"}</h2><Badge variant="outline" className={cn("border-transparent tabular-nums", pending ? "bg-task-pending-border/50 text-task-pending-foreground" : "bg-task-completed-border/50 text-task-completed-foreground")}>{count}</Badge></div>
    <div className="flex flex-1 flex-col gap-4 text-card-foreground">{children}{count === 0 && <div className={cn("flex min-h-64 flex-1 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 text-center", pending ? "border-task-pending-border text-task-pending-foreground" : "border-task-completed-border text-task-completed-foreground")}><span className="rounded-full bg-card p-3 shadow-sm">{pending ? <ClipboardList className="size-7" /> : <CheckCheck className="size-7" />}</span><p className="text-sm font-medium">Nenhuma tarefa {pending ? "pendente" : "concluída"}.</p></div>}</div>
  </section>;
}

export function TaskBoard(props: BoardProps) {
  const [dragged, setDragged] = useState<BoardItem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));
  function end(event: DragEndEvent) {
    setDragged(null);
    if (!props.canEdit || props.busy) return;
    const task = props.tasks.find((item) => item.id === event.active.id);
    const targetTask = props.tasks.find((item) => item.id === event.over?.id);
    const status = targetTask?.status ?? event.over?.id;
    if (task && (status === "pending" || status === "completed") && task.status !== status) props.onMove(task, status);
  }
  return <DndContext sensors={sensors} onDragStart={({ active }) => setDragged(props.tasks.find((task) => task.id === active.id) ?? null)} onDragEnd={end} onDragCancel={() => setDragged(null)}>
    <div className="grid min-w-0 gap-6 md:grid-cols-2">{(["pending", "completed"] as const).map((status) => <Column key={status} status={status} count={props.tasks.filter((task) => task.status === status).length}>
      {props.tasks.filter((task) => task.status === status).map((task) => <TaskCard key={task.id} {...props} task={task} />)}
    </Column>)}</div>
    <DragOverlay>{dragged && <div className="max-w-sm rounded-lg border border-primary bg-card p-4 font-semibold text-card-foreground shadow-lg">{dragged.title}</div>}</DragOverlay>
  </DndContext>;
}