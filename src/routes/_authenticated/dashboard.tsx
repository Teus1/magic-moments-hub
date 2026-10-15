import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { annualFinance, currentMonth, monthBounds, shiftMonth, type FinancialEvent } from "@/lib/dashboard-finance";
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

const PAGE_SIZE = 10;
const chartConfig = {
  contracted: { label: "Contratado", color: "var(--primary)" },
  received: { label: "Recebido", color: "var(--accent)" },
};

function QueryFeedback({ loading, error, empty, onRetry }: { loading: boolean; error: boolean; empty: string; onRetry: () => void }) {
  if (loading) return <p role="status" className="py-6 text-sm text-muted-foreground">Carregando…</p>;
  if (error) return <div role="alert" className="flex flex-wrap items-center gap-3 py-5 text-sm text-destructive">Não foi possível carregar os dados.<Button variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button></div>;
  return <p className="py-5 text-sm text-muted-foreground">{empty}</p>;
}

function DashboardPage() {
  const { user, can, isPending: userPending } = useCurrentUser();
  const [month, setMonth] = useState(currentMonth);
  const [page, setPage] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | null>(null);
  const canViewEvents = can("events", "view");
  const year = Number(month.slice(0, 4));
  const { start, end } = monthBounds(month);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  function selectMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || Number(value.slice(0, 4)) < 1 || Number(value.slice(0, 4)) > 9999) return;
    setMonth(value); setPage(0);
  }

  const financialEvents = useQuery({
    queryKey: ["dashboard", "annual-finance", year], enabled: canViewEvents,
    queryFn: async () => {
      const events: FinancialEvent[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("events")
          .select("id,event_date,status,contracted_value,received_value")
          .gte("event_date", `${year}-01-01`).lte("event_date", `${year}-12-31`)
          .order("id").range(offset, offset + 499);
        if (error) throw error;
        events.push(...(data ?? []));
        if ((data?.length ?? 0) < 500) return events;
      }
    },
  });
  const monthEvents = useQuery({
    queryKey: ["dashboard", "month-list", start, end, page], enabled: canViewEvents,
    queryFn: async () => {
      const { data, error, count } = await supabase.from("events")
        .select("id,name,event_date,start_time,end_time,venue,status,contracted_value,received_value,clients:client_id(full_name),services:service_id(name,color)", { count: "exact" })
        .gte("event_date", start).lte("event_date", end)
        .order("event_date").order("start_time").order("id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { events: (data ?? []) as unknown as DashboardEvent[], count: count ?? 0 };
    },
  });
  const chartData = useMemo(() => annualFinance(financialEvents.data ?? [], year), [financialEvents.data, year]);
  const totals = chartData.find(item => item.month === month);
  const value = (amount: number) => financialEvents.isPending || financialEvents.isError ? "—" : formatCurrency(amount);
  const totalPages = Math.max(1, Math.ceil((monthEvents.data?.count ?? 0) / PAGE_SIZE));

  return <AppShell contentClassName="max-w-[1440px] py-6 lg:px-10">
    <div className="dashboard-view space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="mb-1 text-xs font-medium text-muted-foreground">Dashboard</p><h1 className="text-2xl font-semibold">{user?.name ? `Olá, ${user.name.split(" ")[0]}` : "Visão geral"}</h1></div>
        {can("events", "create") && <Button asChild className="shadow-none"><Link to="/eventos" search={{ action: "new" }}><Plus />Novo evento</Link></Button>}
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
        <div className="grid w-full grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => selectMonth(shiftMonth(month, -1))}><ChevronLeft /></Button>
          <Input type="month" aria-label="Selecionar mês e ano" value={month} onChange={event => selectMonth(event.target.value)} className="w-full bg-card sm:w-[180px]" />
          <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => selectMonth(shiftMonth(month, 1))}><ChevronRight /></Button>
          <Button variant="ghost" size="sm" className="col-span-3" disabled={month === currentMonth()} onClick={() => selectMonth(currentMonth())}>Mês atual</Button>
        </div>
      </div>
      {!canViewEvents && !userPending && <p className="text-sm text-muted-foreground">Você não tem permissão para visualizar os indicadores de eventos.</p>}
      {canViewEvents && <>
        <section aria-label="Resumo financeiro" className="border-y border-border py-5">
          <h2 className="mb-4 text-xs font-semibold uppercase text-muted-foreground">Financeiro <span className="ml-2 font-normal normal-case">· eventos do mês</span></h2>
          <dl className="grid gap-5 sm:grid-cols-3">
            {[ ["Valor contratado", totals?.contracted ?? 0], ["Valor recebido", totals?.received ?? 0], ["Saldo a receber", totals?.balance ?? 0] ].map(([label, amount], index) => <div key={label} className="min-w-0 sm:border-l sm:border-border sm:pl-5 sm:first:border-l-0 sm:first:pl-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={cn("mt-2 break-words text-2xl font-semibold tabular-nums", index === 2 && "text-primary")}>{value(Number(amount))}</dd></div>)}
          </dl>
          {financialEvents.isError && <QueryFeedback loading={false} error empty="" onRetry={() => { void financialEvents.refetch(); }} />}
        </section>
        <section aria-labelledby="finance-chart-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="finance-chart-title" className="text-lg font-semibold">Demonstrativo financeiro <span className="font-normal text-muted-foreground">· {year}</span></h2><div className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-primary" />Contratado</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-accent" />Recebido</span></div></div>
          {financialEvents.isPending || financialEvents.isError ? <QueryFeedback loading={financialEvents.isPending} error={financialEvents.isError} empty="" onRetry={() => { void financialEvents.refetch(); }} /> : <>
            <div className="overflow-x-auto">
              <ChartContainer config={chartConfig} className="h-[270px] min-w-[640px] w-full aspect-auto" aria-label={`Valores contratados e recebidos por mês de ${year}`}>
                <BarChart accessibilityLayer data={chartData} margin={{ top: 12, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} height={40} tickMargin={10} interval={0} tick={({ x, y, payload }) => <text x={x} y={Number(y) + 12} textAnchor="middle" fill={chartData[payload.index]?.month === month ? "var(--primary)" : "var(--muted-foreground)"} fontWeight={chartData[payload.index]?.month === month ? 700 : 400}>{payload.value}</text>} />
                  <YAxis axisLine={false} tickLine={false} width={65} tickFormatter={amount => new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(amount)} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(amount, name) => <div className="flex w-full items-center justify-between gap-5"><span className="text-muted-foreground">{name === "contracted" ? "Contratado" : "Recebido"}</span><span className="font-semibold tabular-nums">{formatCurrency(Number(amount))}</span></div>} />} />
                  <Bar dataKey="contracted" fill="var(--color-contracted)" radius={[3, 3, 0, 0]} maxBarSize={24}>{chartData.map(item => <Cell key={item.month} fillOpacity={item.month === month ? 1 : 0.65} />)}</Bar>
                  <Bar dataKey="received" fill="var(--color-received)" radius={[3, 3, 0, 0]} maxBarSize={24}>{chartData.map(item => <Cell key={item.month} fillOpacity={item.month === month ? 1 : 0.65} />)}</Bar>
                </BarChart>
              </ChartContainer>
            </div>
            {!chartData.some(item => item.contracted || item.received) && <p className="mt-3 text-xs text-muted-foreground">Nenhum valor registrado para os eventos deste ano.</p>}
          </>}
        </section>
        <section aria-labelledby="events-title" className="border-t border-border pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="events-title" className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="size-4 text-primary" />Eventos do mês {monthEvents.isSuccess && <span className="text-sm font-normal text-muted-foreground">({monthEvents.data.count})</span>}</h2><Button variant="link" size="sm" asChild><Link to="/eventos">Ver todos<ArrowRight /></Link></Button></div>
          {monthEvents.isPending || monthEvents.isError || !monthEvents.data?.events.length ? <QueryFeedback loading={monthEvents.isPending} error={monthEvents.isError} empty="Nenhum evento neste mês." onRetry={() => { void monthEvents.refetch(); }} /> : <>
            <div className="hidden grid-cols-[120px_minmax(0,1.6fr)_minmax(0,1fr)_110px_40px] gap-5 border-b border-border pb-2 text-xs text-muted-foreground md:grid"><span>Data e horário</span><span>Evento / cliente</span><span>Serviço</span><span>Status</span><span /></div>
            <div className="divide-y divide-border">{monthEvents.data.events.map(event => <EventLine key={event.id} event={event} onOpen={() => setSelectedEvent(event)} />)}</div>
          </>}
          {totalPages > 1 && <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4"><span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span><Button variant="outline" size="icon" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(value => value - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Próxima página" disabled={page + 1 >= totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight /></Button></div>}
        </section>
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
