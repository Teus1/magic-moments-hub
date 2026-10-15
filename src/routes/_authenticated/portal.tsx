import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  BookHeart,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "@/lib/clients";
import {
  EVENT_DISPLAY_STATUS_CLASSES,
  EVENT_DISPLAY_STATUS_LABELS,
  formatCurrency,
  formatEventDate,
  formatTimeRange,
  resolveEventStatus,
  type EventStatus,
} from "@/lib/events";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Minha agenda — Magic Moments" },
      {
        name: "description",
        content: "Agenda pessoal do colaborador com eventos, locais e valores da Magic Moments.",
      },
      { property: "og:title", content: "Minha agenda — Magic Moments" },
      {
        property: "og:description",
        content: "Agenda pessoal do colaborador com eventos, locais e valores da Magic Moments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CollaboratorPortalPage,
});

type ScheduleFilter = "upcoming" | "done" | "all";

interface CollaboratorProfile {
  id: string;
  full_name: string;
  nickname: string | null;
  role_title: string | null;
  status: "active" | "inactive";
}

interface ScheduleItem {
  id: string;
  agreed_value: number;
  paid_value: number;
  role_title: string | null;
  notes: string | null;
  event: {
    id: string;
    name: string;
    event_type: string | null;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
    address: string | null;
    status: EventStatus;
    notes: string | null;
    has_ceremonial: boolean;
    ceremonial_name: string | null;
    ceremonial_contact: string | null;
    contact_via_ceremonial: boolean;
    has_guestbook: boolean;
    client: {
      full_name: string;
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
    } | null;
    service: { name: string; color: string } | null;
  } | null;
}

function localTodayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function CollaboratorPortalPage() {
  const { can } = useCurrentUser();
  const canView = can("portal", "view");
  const [filter, setFilter] = useState<ScheduleFilter>("upcoming");
  const today = useMemo(localTodayISO, []);

  const collaborator = useQuery({
    queryKey: ["collaborator-portal", "profile"],
    enabled: canView,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sua sessão expirou. Entre novamente.");
      const { data, error } = await supabase
        .from("collaborators")
        .select("id, full_name, nickname, role_title, status")
        .eq("profile_id", userId)
        .maybeSingle();
      if (error) throw new Error("Não foi possível carregar seu perfil de colaborador.");
      return data as CollaboratorProfile | null;
    },
  });

  const schedule = useQuery({
    queryKey: ["collaborator-portal", "schedule", collaborator.data?.id],
    enabled: canView && Boolean(collaborator.data),
    queryFn: async () => {
      const collaboratorId = collaborator.data?.id;
      if (!collaboratorId) return [];
      const { data, error } = await supabase
        .from("event_collaborators")
        .select(`
          id, agreed_value, paid_value, role_title, notes,
          event:events!event_collaborators_event_id_fkey (
            id, name, event_type, event_date, start_time, end_time, venue, address, status, notes,
            has_ceremonial, ceremonial_name, ceremonial_contact, contact_via_ceremonial, has_guestbook,
            client:clients!events_client_id_fkey (full_name, phone, whatsapp, email),
            service:services!events_service_id_fkey (name, color)
          )
        `)
        .eq("collaborator_id", collaboratorId);
      if (error) throw new Error("Não foi possível carregar sua agenda.");
      return (data ?? []) as unknown as ScheduleItem[];
    },
  });

  const items = useMemo(
    () =>
      (schedule.data ?? [])
        .filter((item) => item.event)
        .sort((a, b) => {
          const aDate = `${a.event?.event_date ?? ""} ${a.event?.start_time ?? ""}`;
          const bDate = `${b.event?.event_date ?? ""} ${b.event?.start_time ?? ""}`;
          return aDate.localeCompare(bDate);
        }),
    [schedule.data],
  );

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => {
      const event = item.event;
      if (!event || event.status === "cancelled") return false;
      return filter === "upcoming" ? event.event_date >= today : event.event_date < today;
    });
  }, [filter, items, today]);

  const totals = useMemo(
    () =>
      items.reduce(
        (sum, item) => {
          if (item.event?.status === "cancelled") return sum;
          sum.agreed += Number(item.agreed_value ?? 0);
          sum.paid += Number(item.paid_value ?? 0);
          if (item.event && item.event.event_date >= today) sum.upcoming += 1;
          return sum;
        },
        { agreed: 0, paid: 0, upcoming: 0 },
      ),
    [items, today],
  );

  if (!canView) {
    return (
      <AppShell>
        <PageHeader title="Minha agenda" description="Você não tem permissão para acessar esta área." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Minha agenda"
        description={
          collaborator.data
            ? `${collaborator.data.nickname || collaborator.data.full_name}${collaborator.data.role_title ? ` · ${collaborator.data.role_title}` : ""}`
            : "Seus eventos, informações operacionais e pagamentos."
        }
      />

      {collaborator.isLoading ? (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Carregando sua agenda...
          </CardContent>
        </Card>
      ) : collaborator.isError ? (
        <Card className="border-destructive/30 bg-card/80">
          <CardContent className="py-12 text-center text-sm text-destructive">
            {collaborator.error.message}
          </CardContent>
        </Card>
      ) : !collaborator.data ? (
        <Card className="border-primary/15 bg-card/80">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BriefcaseBusiness className="size-6" />
            </span>
            <h2 className="font-display text-xl">Conta ainda não vinculada</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Peça a um administrador para vincular sua conta ao seu cadastro de colaborador.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={CalendarDays} label="Próximos eventos" value={String(totals.upcoming)} />
            <SummaryCard icon={Wallet} label="Valor combinado" value={formatCurrency(totals.agreed)} />
            <SummaryCard icon={CheckCircle2} label="Valor recebido" value={formatCurrency(totals.paid)} accent />
            <SummaryCard
              icon={Wallet}
              label="Valor a receber"
              value={formatCurrency(totals.agreed - totals.paid)}
            />
          </div>

          <div className="my-6 flex w-full gap-1 overflow-x-auto rounded-lg border border-border/70 bg-card/70 p-1 sm:w-fit">
            {([
              ["upcoming", "Próximos"],
              ["done", "Realizados"],
              ["all", "Todos"],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={filter === value ? "default" : "ghost"}
                size="sm"
                className="min-w-24"
                onClick={() => setFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          {schedule.isLoading ? (
            <Card className="border-border/60 bg-card/80">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Carregando eventos...
              </CardContent>
            </Card>
          ) : schedule.isError ? (
            <Card className="border-destructive/30 bg-card/80">
              <CardContent className="py-12 text-center text-sm text-destructive">
                {schedule.error.message}
              </CardContent>
            </Card>
          ) : visibleItems.length === 0 ? (
            <Card className="border-border/60 bg-card/80">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <CalendarDays className="mb-3 size-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  {filter === "upcoming"
                    ? "Você não tem próximos eventos na escala."
                    : filter === "done"
                      ? "Nenhum evento realizado na sua agenda."
                      : "Nenhum evento vinculado ao seu cadastro."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {visibleItems.map((item) => (
                <ScheduleCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardContent className="flex items-center gap-3 py-5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            accent ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate font-display text-xl text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleCard({ item }: { item: ScheduleItem }) {
  const event = item.event;
  if (!event) return null;

  const displayStatus = resolveEventStatus(event.status, event.event_date);
  const balance = Number(item.agreed_value ?? 0) - Number(item.paid_value ?? 0);
  const clientPhone = item.event?.client?.whatsapp || item.event?.client?.phone;
  const mapQuery = [event.venue, event.address].filter(Boolean).join(", ");

  return (
    <Card className="overflow-hidden border-border/60 bg-card/85 shadow-card backdrop-blur-sm">
      <div className="h-1 bg-primary" />
      <CardHeader className="pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-primary">{formatEventDate(event.event_date)}</p>
              <Badge variant="outline" className={EVENT_DISPLAY_STATUS_CLASSES[displayStatus]}>
                {EVENT_DISPLAY_STATUS_LABELS[displayStatus]}
              </Badge>
              {event.has_guestbook && (
                <Badge variant="outline" className="border-accent/60 bg-accent/10 text-accent-foreground">
                  <BookHeart className="mr-1 size-3" /> Guestbook
                </Badge>
              )}
            </div>
            <CardTitle className="break-words font-display text-xl">{event.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {[event.event_type, event.service?.name].filter(Boolean).join(" · ") || "Evento"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4 text-primary" />
            {formatTimeRange(event.start_time, event.end_time)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <section className="space-y-4">
            <InfoBlock icon={MapPin} title="Local">
              <p>{event.venue || "Local a definir"}</p>
              {event.address && <p className="text-muted-foreground">{event.address}</p>}
              {mapQuery && (
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin className="size-3.5" /> Abrir no mapa
                  </a>
                </Button>
              )}
            </InfoBlock>

            <InfoBlock icon={UserRound} title="Cliente">
              <p>{event.client?.full_name ?? "Cliente não informado"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {clientPhone && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`https://wa.me/55${onlyDigits(clientPhone)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-3.5" /> WhatsApp
                    </a>
                  </Button>
                )}
                {event.client?.phone && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`tel:${onlyDigits(event.client.phone)}`}>
                      <Phone className="size-3.5" /> Ligar
                    </a>
                  </Button>
                )}
                {event.client?.email && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${event.client.email}`}>
                      <Mail className="size-3.5" /> E-mail
                    </a>
                  </Button>
                )}
              </div>
            </InfoBlock>

            {event.has_ceremonial && (
              <InfoBlock icon={Sparkles} title="Cerimonial">
                <p>{event.ceremonial_name || "Nome não informado"}</p>
                {event.ceremonial_contact && (
                  <p className="text-muted-foreground">{event.ceremonial_contact}</p>
                )}
                {event.contact_via_ceremonial && (
                  <Badge variant="outline" className="mt-2 max-w-full whitespace-normal border-primary/30 bg-primary/5 text-primary">
                    Contato direto com o cerimonial
                  </Badge>
                )}
              </InfoBlock>
            )}
          </section>

          <section className="rounded-lg border border-primary/15 bg-primary/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Wallet className="size-4 text-primary" /> Seu pagamento
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Combinado</dt>
                <dd className="font-medium">{formatCurrency(Number(item.agreed_value ?? 0))}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Recebido</dt>
                <dd className="font-medium text-success">{formatCurrency(Number(item.paid_value ?? 0))}</dd>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium">A receber</dt>
                <dd className="font-display text-lg text-primary">{formatCurrency(balance)}</dd>
              </div>
            </dl>
            {(item.role_title || item.notes) && (
              <div className="mt-4 border-t border-primary/15 pt-4 text-sm">
                {item.role_title && <p className="font-medium">Função: {item.role_title}</p>}
                {item.notes && <p className="mt-1 text-muted-foreground">{item.notes}</p>}
              </div>
            )}
          </section>
        </div>

        {event.notes && (
          <div className="border-t border-border/70 pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Observações do evento</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{event.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 break-words text-sm">
        <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}
