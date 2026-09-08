import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BookHeart, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  EVENT_DISPLAY_STATUS_CLASSES,
  EVENT_DISPLAY_STATUS_LABELS,
  formatTimeRange,
  resolveEventStatus,
  type EventDisplayStatus,
  type EventStatus,
} from "@/lib/events";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Magic Moments" },
      {
        name: "description",
        content: "Agenda mensal dos eventos da Magic Moments.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

interface CalendarEvent {
  id: string;
  name: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  status: EventStatus;
  has_guestbook: boolean;
  client: { full_name: string } | null;
  service: { name: string; color: string } | null;
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarPage() {
  const { can } = useCurrentUser();
  const canView = can("calendar", "view");

  const today = new Date();
  const todayISO = toISODate(today.getFullYear(), today.getMonth(), today.getDate());

  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ["calendar-events", cursor.year, cursor.month],
    enabled: canView,
    queryFn: async () => {
      const start = toISODate(cursor.year, cursor.month, 1);
      const end = toISODate(cursor.year, cursor.month + 1, 1);
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, name, event_date, start_time, end_time, venue, status, has_guestbook, client:clients(full_name), service:services(name, color)",
        )
        .gte("event_date", start)
        .lt("event_date", end)
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw new Error("Não foi possível carregar os eventos.");
      return (data ?? []) as unknown as CalendarEvent[];
    },
  });

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events.data ?? []) {
      const list = map.get(event.event_date) ?? [];
      list.push(event);
      map.set(event.event_date, list);
    }
    return map;
  }, [events.data]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const offset = (first.getDay() + 6) % 7; // segunda-feira = 0
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const result: { iso: string | null; day: number | null }[] = [];
    for (let i = 0; i < offset; i++) result.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d++)
      result.push({ iso: toISODate(cursor.year, cursor.month, d), day: d });
    while (result.length % 7 !== 0) result.push({ iso: null, day: null });
    return result;
  }, [cursor]);

  const selectedEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  function moveMonth(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  if (!canView) {
    return (
      <AppShell>
        <PageHeader
          title="Calendário"
          description="Você não tem permissão para visualizar este módulo."
        />
      </AppShell>
    );
  }

  const isCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth();

  return (
    <AppShell>
      <PageHeader
        title="Calendário"
        description="Visão mensal dos eventos. Clique em um dia para ver os detalhes."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => moveMonth(-1)} aria-label="Mês anterior">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => moveMonth(1)} aria-label="Próximo mês">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <h2 className="font-display text-xl">
              {MONTH_NAMES[cursor.month]} de {cursor.year}
            </h2>
            {!isCurrentMonth ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
              >
                Hoje
              </Button>
            ) : (
              <span className="w-14" />
            )}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="pb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
            {cells.map((cell, index) => {
              if (!cell.iso) return <div key={`empty-${index}`} />;
              const dayEvents = byDay.get(cell.iso) ?? [];
              const isToday = cell.iso === todayISO;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => dayEvents.length > 0 && setSelectedDay(cell.iso)}
                  className={cn(
                    "flex min-h-20 flex-col gap-1 rounded-lg border border-transparent p-1.5 text-left transition-colors sm:min-h-24",
                    dayEvents.length > 0
                      ? "cursor-pointer hover:border-primary/30 hover:bg-primary/5"
                      : "cursor-default",
                    isToday && "border-primary/40 bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {cell.day}
                  </span>
                  <div className="flex flex-col gap-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span
                        key={event.id}
                        className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: event.service?.color ?? "#6335A7" }}
                        title={event.name}
                      >
                        {event.name}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="px-1 text-[10px] text-muted-foreground">
                        +{dayEvents.length - 2} mais
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {events.isLoading && (
            <p className="pt-4 text-center text-sm text-muted-foreground">Carregando eventos...</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-primary/10 bg-background/95 p-0 shadow-elevated backdrop-blur-xl sm:max-w-lg sm:rounded-xl">
          <DialogHeader className="border-b border-border/70 bg-card/70 px-6 pb-5 pt-6">
            <DialogTitle className="flex items-center gap-2 font-display">
              <CalendarDays className="size-5 text-primary" />
              {selectedDay && formatDayTitle(selectedDay)}
            </DialogTitle>
            <DialogDescription>
              {selectedEvents.length}{" "}
              {selectedEvents.length === 1 ? "evento neste dia" : "eventos neste dia"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-6 py-5">
            {selectedEvents.map((event) => {
              const displayStatus: EventDisplayStatus = resolveEventStatus(
                event.status,
                event.event_date,
              );
              return (
                <Card key={event.id} className="border-border/70 bg-card/70">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{event.name}</p>
                        {event.client && (
                          <p className="text-sm text-muted-foreground">
                            {event.client.full_name}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0", EVENT_DISPLAY_STATUS_CLASSES[displayStatus])}
                      >
                        {EVENT_DISPLAY_STATUS_LABELS[displayStatus]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {formatTimeRange(event.start_time, event.end_time)}
                      </span>
                      {event.venue && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {event.venue}
                        </span>
                      )}
                      {event.has_guestbook && (
                        <span className="flex items-center gap-1.5">
                          <BookHeart className="size-3.5" />
                          Caderno de Memórias
                        </span>
                      )}
                    </div>
                    {event.service && (
                      <Badge
                        variant="outline"
                        className="border-transparent text-white"
                        style={{ backgroundColor: event.service.color }}
                      >
                        {event.service.name}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function formatDayTitle(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day} de ${MONTH_NAMES[Number(month) - 1]} de ${year}`;
}
