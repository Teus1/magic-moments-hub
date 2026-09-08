import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  HardHat,
  PartyPopper,
  Sparkles,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  EVENT_DISPLAY_STATUS_CLASSES,
  EVENT_DISPLAY_STATUS_LABELS,
  formatCurrency,
  formatEventDate,
  formatTimeRange,
  resolveEventStatus,
  type EventStatus,
} from "@/lib/events";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Magic Moments" },
      { name: "description", content: "Visão geral operacional da Magic Moments." },
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

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg",
              accent ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-4" />
          </span>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { user, can } = useCurrentUser();
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
      const color = e.services?.color ?? "#6335A7";
      const current = map.get(name);
      if (current) current.count += 1;
      else map.set(name, { name, color, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [activeEvents]);

  return (
    <AppShell>
      <PageHeader
        title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`}
        description={`Visão geral da operação — ${monthLabel}.`}
      />

      {canViewEvents ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={PartyPopper}
            label="Eventos no mês"
            value={String(activeEvents.length)}
            hint={`${doneCount} realizados · ${cancelledCount} cancelados`}
          />
          <StatCard icon={TrendingUp} label="Valor contratado" value={formatCurrency(contracted)} hint="No mês atual" />
          <StatCard icon={Wallet} label="Valor recebido" value={formatCurrency(received)} hint="No mês atual" accent />
          <StatCard icon={CheckCircle2} label="Saldo a receber" value={formatCurrency(balance)} hint="No mês atual" />
        </div>
      ) : (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Você não tem permissão para visualizar os indicadores de eventos.
          </CardContent>
        </Card>
      )}

      {(canViewClients || canViewServices || canViewCollaborators) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canViewClients && (
            <StatCard
              icon={UsersRound}
              label="Clientes cadastrados"
              value={totals.data?.clients != null ? String(totals.data.clients) : "—"}
            />
          )}
          {canViewServices && (
            <StatCard
              icon={Sparkles}
              label="Serviços ativos"
              value={totals.data?.services != null ? String(totals.data.services) : "—"}
            />
          )}
          {canViewCollaborators && (
            <StatCard
              icon={HardHat}
              label="Colaboradores ativos"
              value={totals.data?.collaborators != null ? String(totals.data.collaborators) : "—"}
            />
          )}
        </div>
      )}

      {canViewEvents && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4 text-primary" />
                Próximos eventos
              </CardTitle>
              <Link
                to="/eventos"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver todos <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(upcoming.data ?? []).length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">Nenhum evento agendado.</p>
              )}
              {(upcoming.data ?? []).map((e) => (
                <EventLine key={e.id} event={e} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-4 text-primary" />
                Realizados recentemente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(recent.data ?? []).length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">Nenhum evento realizado ainda.</p>
              )}
              {(recent.data ?? []).map((e) => (
                <EventLine key={e.id} event={e} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 backdrop-blur-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" />
                Eventos por serviço — {monthLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byService.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Nenhum evento no mês.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {byService.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2"
                    >
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-foreground">{item.name}</span>
                      <span className="text-sm font-semibold text-primary">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function EventLine({ event }: { event: DashboardEvent }) {
  const display = resolveEventStatus(event.status, event.event_date);
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-background/50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{event.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {event.clients?.full_name ?? "Cliente não informado"}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatEventDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)}
        </p>
      </div>
      <Badge variant="outline" className={cn("shrink-0", EVENT_DISPLAY_STATUS_CLASSES[display])}>
        {EVENT_DISPLAY_STATUS_LABELS[display]}
      </Badge>
    </div>
  );
}
