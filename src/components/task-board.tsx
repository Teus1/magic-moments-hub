import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import { CalendarDays, Check, CheckCheck, Circle, GripVertical, RotateCcw, UserRound } from "lucide-react";
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
  return <article ref={setNodeRef} style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
    className={cn("relative rounded-lg border border-border bg-card p-4 shadow-sm", isDragging && "opacity-30")}>
    <div className="flex items-start gap-2">
      <Button variant="ghost" onClick={() => onOpen(task)} className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left text-base font-semibold hover:bg-transparent hover:text-primary"><span className="break-words">{task.title}</span></Button>
      {canEdit && <Button variant="ghost" size="icon" {...attributes} {...listeners} aria-label={`Mover ${task.title}`} title="Mover tarefa" disabled={busy} className="size-8 shrink-0 touch-none text-muted-foreground"><GripVertical /></Button>}
    </div>
    {task.progress && <p className="mt-2 text-sm font-medium text-primary">{task.progress.completed} de {task.progress.total} concluídas</p>}
    {task.observations && <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.observations}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {task.assignee_id && <span className="flex min-w-0 items-center gap-1.5"><UserRound className="size-3.5 shrink-0" /><span className="break-words">{assignees.get(task.assignee_id) ?? "Responsável"}</span></span>}
      {task.date && <span className={cn("flex items-center gap-1.5", overdue && "font-medium text-destructive")}><CalendarDays className="size-3.5" />{taskDate(task.date)}{overdue ? " · Atrasada" : ""}</span>}
    </div>
    {task.progress && !task.date && <p className="mt-3 text-xs text-muted-foreground">Data do evento a definir</p>}
    {canEdit && <div className="mt-4 border-t border-border pt-2"><Button variant="ghost" size="sm" disabled={busy} onClick={() => onMove(task, task.status === "pending" ? "completed" : "pending")} className="text-primary">{task.status === "pending" ? <Check /> : <RotateCcw />}{task.status === "pending" ? "Concluir" : "Reabrir"}</Button></div>}
  </article>;
}

function Column({ status, children, count }: { status: TaskStatus; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return <section ref={setNodeRef} aria-label={status === "pending" ? "Tarefas pendentes" : "Tarefas concluídas"} className={cn("min-w-0 border-t-2 border-border pt-4", isOver && "border-primary bg-primary/5")}>
    <div className="mb-5 flex items-center gap-2">{status === "pending" ? <Circle className="size-4 text-primary" /> : <CheckCheck className="size-4 text-success" />}<h2 className="font-display text-xl">{status === "pending" ? "Pendente" : "Concluída"}</h2><Badge variant="secondary">{count}</Badge></div>
    <div className="min-h-52 space-y-3 pb-8">{children}{count === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma tarefa {status === "pending" ? "pendente" : "concluída"}.</p>}</div>
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