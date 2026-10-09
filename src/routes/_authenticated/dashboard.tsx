import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { EVENT_DISPLAY_STATUS_CLASSES, EVENT_DISPLAY_STATUS_LABELS, formatCurrency, formatEventDate, formatTimeRange, resolveEventStatus, type EventStatus } from "@/lib/events";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Magic Moments" },
      { name: "description", content: "Visão geral operacional da Magic Moments." },
      { property: "og:title", content: "Dashboard — Magic Moments" },
      { property: "og:description", content: "Visão geral operacional da Magic Moments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

interface DashboardEvent {
  id: string;
  name: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  status: EventStatus;
  contracted_value: number;
  received_value: number;
  clients: { full_name: string } | null;
  services: { name: string; color: string } | null;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthRange() {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  const label = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { start, end, label };
}

function Metric({ label, value, hint, highlight = false }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return <div className="min-w-0 border-l border-border pl-4 first:border-l-0 first:pl-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className={cn("mt-2 break-words text-2xl font-semibold tabular-nums", highlight && "text-primary")}>{value}</dd>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

function QueryFeedback({ loading, error, empty, onRetry }: { loading: boolean; error: boolean; empty: string; onRetry: () => void }) {
  if (loading) return <p role="status" className="py-6 text-sm text-muted-foreground">Carregando…</p>;
  if (error) return <div role="alert" className="flex flex-wrap items-center gap-3 py-5 text-sm text-destructive">Não foi possível carregar os dados.<Button variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button></div>;
  return <p className="py-5 text-sm text-muted-foreground">{empty}</p>;
}

function DashboardPage() {
  const { user, can, isPending: userPending } = useCurrentUser();
  const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | null>(null);
  const canViewEvents = can("events", "view");
  const canViewClients = can("clients", "view");
  const canViewServices = can("services", "view");
  const canViewCollaborators = can("collaborators", "view");

  const { start, end, label: monthLabel } = useMemo(monthRange, []);
  const today = useMemo(todayISO, []);

  const monthEvents = useQuery({
    queryKey: ["dashboard", "month-events", start, end],
    enabled: canViewEvents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, name, event_date, start_time, end_time, venue, status, contracted_value, received_value, clients:client_id (full_name), services:service_id (name, color)",
        )
        .gte("event_date", start)
        .lte("event_date", end)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DashboardEvent[];
    },
  });

  const upcoming = useQuery({
    queryKey: ["dashboard", "upcoming", today],
    enabled: canViewEvents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, name, event_date, start_time, end_time, venue, status, contracted_value, received_value, clients:client_id (full_name), services:service_id (name, color)",
        )
        .gte("event_date", today)
        .neq("status", "cancelled")
        .order("event_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as DashboardEvent[];
    },
  });

  const recent = useQuery({
    queryKey: ["dashboard", "recent", today],
    enabled: canViewEvents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, name, event_date, start_time, end_time, venue, status, contracted_value, received_value, clients:client_id (full_name), services:service_id (name, color)",
        )
        .lt("event_date", today)
        .neq("status", "cancelled")
        .order("event_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as DashboardEvent[];
    },
  });

  const totals = useQuery({
    queryKey: ["dashboard", "totals", canViewClients, canViewServices, canViewCollaborators],
    queryFn: async () => {
      const [clients, services, collaborators] = await Promise.all([
        canViewClients
          ? supabase.from("clients").select("id", { count: "exact", head: true })
          : Promise.resolve({ count: null }),
        canViewServices
          ? supabase.from("services").select("id", { count: "exact", head: true }).eq("status", "active")
          : Promise.resolve({ count: null }),
        canViewCollaborators
          ? supabase.from("collaborators").select("id", { count: "exact", head: true }).eq("status", "active")
          : Promise.resolve({ count: null }),
      ]);
      return {
        clients: clients.count ?? null,
        services: services.count ?? null,
        collaborators: collaborators.count ?? null,
      };
    },
    enabled: canViewClients || canViewServices || canViewCollaborators,
  });

  const events = monthEvents.data ?? [];
  const activeEvents = events.filter((e) => e.status !== "cancelled");
  const contracted = activeEvents.reduce((sum, e) => sum + Number(e.contracted_value || 0), 0);
  const received = activeEvents.reduce((sum, e) => sum + Number(e.received_value || 0), 0);
  const balance = contracted - received;
  const doneCount = activeEvents.filter((e) => resolveEventStatus(e.status, e.event_date) === "done").length;
  const cancelledCount = events.length - activeEvents.length;

  const byService = useMemo(() => {
    const map = new Map<string, { name: string; color: string; count: number }>();
    for (const e of activeEvents) {
      const name = e.services?.name ?? "Sem serviço";
      const color = e.services?.color ?? "var(--primary)";
      const current = map.get(name);
      if (current) current.count += 1;
      else map.set(name, { name, color, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [activeEvents]);

  const monthValue = (value: string) => monthEvents.isPending || monthEvents.isError ? "—" : value;
  const totalValue = (value: number | null | undefined) => totals.isPending || totals.isError || value == null ? "—" : String(value);
  const createAction = can("events", "create") ? <Button asChild className="shadow-none"><Link to="/eventos" search={{ action: "new" }}><Plus />Novo evento</Link></Button> : null;

  return <AppShell contentClassName="max-w-[1440px] py-6 lg:px-10">
    <div className="dashboard-view space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="mb-1 text-xs font-medium text-muted-foreground">Dashboard <span className="mx-2 text-border">/</span><span className="capitalize">{monthLabel}</span></p>
          <h1 className="text-2xl font-semibold">{user?.name ? `Olá, ${user.name.split(" ")[0]}` : "Visão geral"}</h1>
        </div>{createAction}
      </header>

      <section aria-label="Indicadores" className="grid gap-6 border-y border-border py-5 xl:grid-cols-[1.15fr_1fr]">
        {(canViewEvents || canViewClients || canViewServices || canViewCollaborators) && <div className="min-w-0">
          <h2 className="mb-4 text-xs font-semibold uppercase text-muted-foreground">Operacional</h2>
          <dl className="grid grid-cols-2 gap-y-5 md:grid-cols-4">
            {canViewEvents && <Metric label="Eventos no mês" value={monthValue(String(activeEvents.length))} hint={monthEvents.isSuccess ? `${doneCount} realizados · ${cancelledCount} cancelados` : undefined} highlight />}
            {canViewClients && <Metric label="Clientes cadastrados" value={totalValue(totals.data?.clients)} />}
            {canViewServices && <Metric label="Serviços ativos" value={totalValue(totals.data?.services)} />}
            {canViewCollaborators && <Metric label="Colaboradores ativos" value={totalValue(totals.data?.collaborators)} />}
          </dl>
          {totals.isError && <QueryFeedback loading={false} error empty="" onRetry={() => { void totals.refetch(); }} />}
        </div>}
        {canViewEvents && <div className="min-w-0 border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <h2 className="mb-4 text-xs font-semibold uppercase text-muted-foreground">Financeiro <span className="ml-2 font-normal normal-case">· eventos do mês</span></h2>
          <dl className="grid grid-cols-1 gap-y-4 sm:grid-cols-3">
            <Metric label="Valor contratado" value={monthValue(formatCurrency(contracted))} />
            <Metric label="Valor recebido" value={monthValue(formatCurrency(received))} />
            <Metric label="Saldo a receber" value={monthValue(formatCurrency(balance))} highlight />
          </dl>
        </div>}
        {canViewEvents && monthEvents.isError && <QueryFeedback loading={false} error empty="" onRetry={() => { void monthEvents.refetch(); }} />}
        {!canViewEvents && !userPending && <p className="text-sm text-muted-foreground">Você não tem permissão para visualizar os indicadores de eventos.</p>}
      </section>

      {canViewEvents && <>
        <section aria-labelledby="upcoming-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="upcoming-title" className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="size-4 text-primary" />Próximos eventos</h2>
            <Button variant="link" size="sm" asChild><Link to="/eventos">Ver todos<ArrowRight /></Link></Button>
          </div>
          {upcoming.isPending || upcoming.isError ? <QueryFeedback loading={upcoming.isPending} error={upcoming.isError} empty="" onRetry={() => { void upcoming.refetch(); }} /> : upcoming.data?.length ? <>
            <div className="hidden grid-cols-[120px_minmax(0,1.6fr)_minmax(0,1fr)_110px_40px] gap-5 border-b border-border pb-2 text-xs text-muted-foreground md:grid"><span>Data e horário</span><span>Evento / cliente</span><span>Serviço</span><span>Status</span><span /></div>
            <div className="divide-y divide-border">{upcoming.data.map((event) => <EventLine key={event.id} event={event} onOpen={() => setSelectedEvent(event)} />)}</div>
          </> : <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border bg-muted/30 px-4 py-6"><div><p className="text-sm font-medium">Nenhum evento agendado.</p><p className="mt-1 text-xs text-muted-foreground">Os próximos compromissos aparecerão aqui.</p></div>{createAction}</div>}
        </section>

        <div className="grid gap-7 border-t border-border pt-6 lg:grid-cols-[1.4fr_1fr]">
          <section aria-labelledby="recent-title"><h2 id="recent-title" className="mb-4 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-muted-foreground" />Realizados recentemente</h2>
            {recent.isPending || recent.isError || !recent.data?.length ? <QueryFeedback loading={recent.isPending} error={recent.isError} empty="Nenhum evento realizado ainda." onRetry={() => { void recent.refetch(); }} /> : <div className="divide-y divide-border">{recent.data.map(event => <div key={event.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{event.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{formatEventDate(event.event_date)} · {event.clients?.full_name ?? "Cliente não informado"}</p></div><Button variant="ghost" size="icon" aria-label={`Abrir detalhes de ${event.name}`} onClick={() => setSelectedEvent(event)}><ArrowRight /></Button></div>)}</div>}
          </section>
          <section aria-labelledby="service-title" className="lg:border-l lg:border-border lg:pl-7"><h2 id="service-title" className="mb-4 text-sm font-semibold">Eventos por serviço</h2>
            {monthEvents.isPending || monthEvents.isError || !byService.length ? <QueryFeedback loading={monthEvents.isPending} error={monthEvents.isError} empty="Nenhum evento no mês." onRetry={() => { void monthEvents.refetch(); }} /> : <div className="space-y-4">{byService.map(item => <div key={item.name}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="truncate">{item.name}</span><span className="font-semibold tabular-nums">{item.count}</span></div><progress className="task-progress h-1.5 w-full" value={item.count} max={activeEvents.length} aria-label={`${item.name}: ${item.count} eventos`} /></div>)}</div>}
          </section>
        </div>
      </>}
    </div>
    <Dialog open={selectedEvent !== null} onOpenChange={open => { if (!open) setSelectedEvent(null); }}><DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{selectedEvent?.name}</DialogTitle><DialogDescription>Detalhes do evento</DialogDescription></DialogHeader>
      {selectedEvent && <><dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">{[
        ["Data", formatEventDate(selectedEvent.event_date)], ["Horário", formatTimeRange(selectedEvent.start_time, selectedEvent.end_time)],
        ["Cliente", selectedEvent.clients?.full_name ?? "Não informado"], ["Serviço", selectedEvent.services?.name ?? "Não informado"],
        ["Local", selectedEvent.venue ?? "Não informado"], ["Status", EVENT_DISPLAY_STATUS_LABELS[resolveEventStatus(selectedEvent.status, selectedEvent.event_date)]],
        ["Valor contratado", formatCurrency(Number(selectedEvent.contracted_value))], ["Valor recebido", formatCurrency(Number(selectedEvent.received_value))]
      ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl><Button variant="outline" asChild><Link to="/eventos">Ir para eventos<ArrowRight /></Link></Button></>}
    </DialogContent></Dialog>
  </AppShell>;
}

function EventLine({ event, onOpen }: { event: DashboardEvent; onOpen: () => void }) {
  const display = resolveEventStatus(event.status, event.event_date);
  const date = new Date(`${event.event_date}T12:00:00`);
  return <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-4 md:grid-cols-[120px_minmax(0,1.6fr)_minmax(0,1fr)_110px_40px] md:gap-5">
    <div className="col-span-2 flex items-center gap-3 md:col-span-1"><div className="flex min-w-10 flex-col items-center border-l-2 border-accent pl-2"><span className="text-lg font-semibold tabular-nums">{String(date.getDate()).padStart(2, "0")}</span><span className="text-[10px] uppercase text-muted-foreground">{date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div><span className="text-xs text-muted-foreground">{formatTimeRange(event.start_time, event.end_time)}</span></div>
    <div className="min-w-0"><p className="truncate text-sm font-semibold">{event.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{event.clients?.full_name ?? "Cliente não informado"}{event.venue ? ` · ${event.venue}` : ""}</p></div>
    <span className="col-start-1 row-start-3 min-w-0 truncate text-xs text-muted-foreground md:col-auto md:row-auto">{event.services?.name ?? "Sem serviço"}</span>
    <Badge variant="outline" className={cn("col-start-2 row-start-3 justify-self-end rounded-md text-[11px] md:col-auto md:row-auto md:justify-self-start", EVENT_DISPLAY_STATUS_CLASSES[display])}>{EVENT_DISPLAY_STATUS_LABELS[display]}</Badge>
    <Button variant="ghost" size="icon" className="col-start-2 row-start-2 md:col-auto md:row-auto" onClick={onOpen} aria-label={`Abrir detalhes de ${event.name}`}><ArrowRight /></Button>
  </div>;
}
