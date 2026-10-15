import { matchesEventFilters } from "@/lib/event-list-filters";
import { useServerFn } from "@tanstack/react-start";
import { EventExtraFields } from "@/components/event-extra-fields";
import { parseGuestCount, type ReferralSource } from "@/lib/event-extra";
import { z } from "zod";
import { TravelPlaceInput } from "@/components/travel-place-input";
import { saveEventDetails } from "@/lib/events.functions";
import { listIntakes } from "@/lib/client-intake.functions";
import { calculatedEnd, durationFromTimes, hoursToMinutes } from "@/lib/event-timing";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookHeart,
  CalendarDays,
  Download,
  Eye,
  EyeOff,
  FileText,
  HardHat,
  MapPin,
  PartyPopper,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Upload,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PickerField } from "@/components/ui/picker-field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  EVENT_DISPLAY_STATUS_CLASSES,
  EVENT_DISPLAY_STATUS_LABELS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_SUGGESTIONS,
  emptyEventForm,
  formatCurrency,
  formatEventDate,
  formatTimeRange,
  parseCurrencyInput,
  resolveEventStatus,
  type EventDisplayStatus,
  type EventForm,
  type EventStatus,
} from "@/lib/events";

export const Route = createFileRoute("/_authenticated/eventos")({
  validateSearch: (search: Record<string, unknown>): { action?: "new"; intake?: string } => ({ ...(search["action"] === "new" ? { action: "new" as const } : {}), ...(z.string().uuid().safeParse(search["intake"]).success ? { intake: String(search["intake"]) } : {}) }),
  head: () => ({
    meta: [
      { title: "Eventos — Magic Moments" },
      {
        name: "description",
        content: "Gestão dos eventos da Magic Moments: datas, serviços, responsáveis e valores.",
      },
      { property: "og:title", content: "Eventos — Magic Moments" },
      {
        property: "og:description",
        content: "Gestão dos eventos da Magic Moments: datas, serviços, responsáveis e valores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EventsPage,
});

interface EventRow {
  id: string;
  client_id: string;
  service_id: string | null;
  name: string;
  event_type: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  venue_city: string | null;
  venue_state: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  preregistration_id: string | null;
  venue: string | null;
  address: string | null;
  has_ceremonial: boolean;
  ceremonial_name: string | null;
  ceremonial_contact: string | null;
  contact_via_ceremonial: boolean;
  has_guestbook: boolean;
  attraction_id: string | null;
  attraction_start_location: string | null;
  guest_count: number | null;
  social_media_consent: boolean | null;
  instagram_handles: string | null;
  referral_source: string | null;
  referral_other: string | null;
  status: EventStatus;
  contracted_value: number;
  received_value: number;
  balance_value: number | null;
  notes: string | null;
  clients: { id: string; full_name: string; whatsapp: string | null } | null;
  services: { id: string; name: string; color: string } | null;
}

type AttachmentCategory = "receipt" | "document";

interface EventAttachment {
  id: string;
  event_id: string;
  category: AttachmentCategory;
  original_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
}

interface PendingAttachment {
  id: string;
  category: AttachmentCategory;
  file: File;
}

const SELECT_COLUMNS = `
  id, client_id, service_id, name, event_type, event_date, start_time, end_time,
  venue, address, duration_minutes, venue_city, venue_state, latitude, longitude, place_id, preregistration_id, status, contracted_value, received_value, balance_value,
  has_ceremonial, ceremonial_name, ceremonial_contact, contact_via_ceremonial, has_guestbook, attraction_id, attraction_start_location, guest_count, social_media_consent, instagram_handles, referral_source, referral_other,
  notes,
  clients:client_id (id, full_name, whatsapp),
  services:service_id (id, name, color)
`;


const NONE = "__none__";
const ATTACHMENTS_BUCKET = "event-attachments";

type PaymentMethod = "pix" | "credit" | "debit" | "cash" | "boleto" | "transfer" | "previous_balance";
interface PaymentDraft {
  amount: string;
  paid_at: string;
  method: PaymentMethod;
}
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transfer", label: "Transferência" },
  { value: "previous_balance", label: "Saldo anterior" },
];
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeFileName(name: string) {
  const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
  return `${crypto.randomUUID()}${extension.toLowerCase().replace(/[^a-z0-9.]/g, "")}`;
}

/** Marcador visual de campo obrigatório. */
function RequiredMark() {
  return (
    <span className="ml-1 text-destructive" aria-hidden="true">
      *
    </span>
  );
}

function EventsPage() {
  const { can } = useCurrentUser();
  const queryClient = useQueryClient();
  const routeSearch = Route.useSearch();
  const saveDetails = useServerFn(saveEventDetails);
  const fetchIntakes = useServerFn(listIntakes);
  const [intakeId, setIntakeId] = useState<string | null>(null);

  const navigate = Route.useNavigate();

  const canView = can("events", "view");
  const canCreate = can("events", "create");
  const canEdit = can("events", "edit");
  const canDelete = can("events", "delete");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EventDisplayStatus>("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [financeFilter, setFinanceFilter] = useState<"all" | "pending" | "paid">("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEventInfo, setShowEventInfo] = useState(true);
  const [showFinancial, setShowFinancial] = useState(true);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState<EventForm>(emptyEventForm);
  const durationMinutes = hoursToMinutes(form.duration_hours);
  const computedEnd = calculatedEnd(form.start_time, durationMinutes);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamValues, setTeamValues] = useState<Record<string, { agreed: string; paid: string }>>({});
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const events = useQuery({
    queryKey: ["events"],
    enabled: canView,
    queryFn: async () => {
      const rows: EventRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("events").select(SELECT_COLUMNS).order("event_date", { ascending: false }).order("id").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar os eventos.");
        rows.push(...(data ?? []) as unknown as EventRow[]);
        if ((data ?? []).length < 500) return rows;
      }
    },
  });

  const clients = useQuery({
    queryKey: ["events", "clients-options"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, full_name").order("full_name");
      if (error) throw new Error("Não foi possível carregar os clientes.");
      return data;
    },
  });

  const services = useQuery({
    queryKey: ["events", "services-options"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, color, status")
        .eq("status", "active")
        .order("name");
      if (error) throw new Error("Não foi possível carregar os serviços.");
      return data;
    },
  });

  const collaborators = useQuery({
    queryKey: ["events", "collaborators-options"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborators")
        .select("id, full_name, nickname, role_title, status")
        .eq("status", "active")
        .order("full_name");
      if (error) throw new Error("Não foi possível carregar os colaboradores.");
      return data ?? [];
    },
  });

  const eventTeams = useQuery({
    queryKey: ["events", "teams"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_collaborators")
        .select(
          "event_id, collaborator_id, agreed_value, paid_value, collaborators:collaborator_id (id, full_name)",
        );
      if (error) throw new Error("Não foi possível carregar a equipe dos eventos.");
      const map: Record<string, { id: string; name: string; agreed: number; paid: number }[]> = {};
      for (const link of (data ?? []) as unknown as {
        event_id: string;
        collaborator_id: string;
        agreed_value: number | null;
        paid_value: number | null;
        collaborators: { id: string; full_name: string } | null;
      }[]) {
        const list = map[link.event_id] ?? (map[link.event_id] = []);
        list.push({
          id: link.collaborator_id,
          name: link.collaborators?.full_name ?? "—",
          agreed: Number(link.agreed_value ?? 0),
          paid: Number(link.paid_value ?? 0),
        });
      }
      return map;
    },
  });

  const attachments = useQuery({
    queryKey: ["event-attachments"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_attachments")
        .select("id, event_id, category, original_name, storage_path, mime_type, size_bytes, created_at")
        .order("created_at", { ascending: true });
      if (error) throw new Error("Não foi possível carregar os anexos dos eventos.");
      return (data ?? []) as EventAttachment[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (events.data ?? []).filter((event) => {
      const displayStatus = resolveEventStatus(event.status, event.event_date);
      if (statusFilter !== "all" && displayStatus !== statusFilter) return false;
      if (!matchesEventFilters(event, { dateStart, dateEnd, service: serviceFilter, client: clientFilter, finance: financeFilter })) return false;
      if (!term) return true;
      return [
        event.name,
        event.event_type,
        event.venue,
        event.address,
        event.clients?.full_name,
        event.services?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [events.data, search, statusFilter, dateStart, dateEnd, serviceFilter, clientFilter, financeFilter]);

  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize);
  const activeFilters = [dateStart, dateEnd, serviceFilter !== "all", clientFilter !== "all", statusFilter !== "all", financeFilter !== "all"].filter(Boolean).length;
  function clearFilters() { setSearch(""); setStatusFilter("all"); setDateStart(""); setDateEnd(""); setServiceFilter("all"); setClientFilter("all"); setFinanceFilter("all"); setPage(1); }
  useEffect(() => { setPage(1); }, [search, statusFilter, dateStart, dateEnd, serviceFilter, clientFilter, financeFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, event) => {
        if (event.status === "cancelled") return acc;
        acc.contracted += Number(event.contracted_value ?? 0);
        acc.received += Number(event.received_value ?? 0);
        return acc;
      },
      { contracted: 0, received: 0 },
    );
  }, [filtered]);

  function openCreate() {
    setIntakeId(null);
    setEditing(null);
    setForm(emptyEventForm);
    setTeamIds([]);
    setTeamValues({});
    setPendingAttachments([]);
    setPayments([]);
    setShowErrors(false);
    setDialogOpen(true);
  }

  function openEdit(event: EventRow) {
    setIntakeId(event.preregistration_id);
    setEditing(event);
    setForm({
      client_id: event.client_id,
      service_id: event.service_id ?? "",
      name: event.name,
      event_type: event.event_type ?? "",
      event_date: event.event_date,
      start_time: event.start_time ? event.start_time.slice(0, 5) : "",
      end_time: event.end_time ?? "",
      duration_hours: (event.duration_minutes ?? durationFromTimes(event.start_time, event.end_time)) ? String((event.duration_minutes ?? durationFromTimes(event.start_time, event.end_time) ?? 0) / 60) : "",
      venue_city: event.venue_city ?? "", venue_state: event.venue_state ?? "", latitude: event.latitude, longitude: event.longitude, place_id: event.place_id,
      venue: event.venue ?? "",
      address: event.address ?? "",
      has_ceremonial: event.has_ceremonial ?? false,
      ceremonial_name: event.ceremonial_name ?? "",
      ceremonial_contact: event.ceremonial_contact ?? "",
      contact_via_ceremonial: event.contact_via_ceremonial ?? false,
      has_guestbook: event.has_guestbook ?? false,
      attraction_id: event.attraction_id ?? "",
      attraction_start_location: event.attraction_start_location ?? "",
      guest_count: event.guest_count ? String(event.guest_count) : "",
      social_media_consent: event.social_media_consent,
      instagram_handles: event.instagram_handles ?? "",
      referral_source: event.referral_source ?? "",
      referral_other: event.referral_other ?? "",

      status: event.status,
      contracted_value: String(event.contracted_value ?? 0),
      received_value: String(event.received_value ?? 0),
      notes: event.notes ?? "",
    });
    const members = eventTeams.data?.[event.id] ?? [];
    setTeamIds(members.map((member) => member.id));
    setTeamValues(
      Object.fromEntries(
        members.map((member) => [
          member.id,
          { agreed: String(member.agreed ?? 0), paid: String(member.paid ?? 0) },
        ]),
      ),
    );
    setPendingAttachments([]);
    setPayments([]);
    supabase
      .from("event_payments")
      .select("amount, paid_at, method")
      .eq("event_id", event.id)
      .order("paid_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar os recebimentos.");
          return;
        }
        setPayments(
          (data ?? []).map((p) => ({
            amount: String(p.amount).replace(".", ","),
            paid_at: p.paid_at,
            method: p.method as PaymentMethod,
          })),
        );
      });
    setShowErrors(false);
    setDialogOpen(true);
  }

  useEffect(() => {
    if (routeSearch.action !== "new" || !canCreate) return;
    const intake = routeSearch.intake;
    void navigate({ to: "/eventos", search: {}, replace: true });
    if (!intake) { openCreate(); return; }
    void fetchIntakes().then(rows => {
      const row = rows.find(item => item.id === intake);
      if (!row || row.status !== "reviewed" || !row.client_id || !row.payload || row.event_id) { toast.error("Pré-cadastro não disponível para criar evento."); return; }
      openCreate(); setIntakeId(row.id);
      const ev = row.payload.event;
      setForm(current => ({ ...current, client_id: row.client_id ?? "", name: row.payload?.event_title ?? "", event_type: row.payload?.event_type ?? "", event_date: row.payload?.event_date ?? "", ...(ev ? { start_time: ev.start_time, duration_hours: ev.duration_minutes ? String(ev.duration_minutes / 60) : "", venue: ev.venue, address: ev.address, venue_city: ev.venue_city, venue_state: ev.venue_state, latitude: ev.latitude, longitude: ev.longitude, place_id: ev.place_id, attraction_id: ev.attraction_id, ...(ev.service_id ? { service_id: ev.service_id } : {}), guest_count: ev.guest_count ? String(ev.guest_count) : "", social_media_consent: ev.social_media_consent ?? null, instagram_handles: ev.instagram_handles ?? "", referral_source: ev.referral_source ?? "", referral_other: ev.referral_other ?? "", has_ceremonial: ev.has_ceremonial, ceremonial_name: ev.ceremonial_name, ceremonial_contact: ev.ceremonial_contact, contact_via_ceremonial: ev.contact_via_ceremonial, has_guestbook: ev.has_guestbook } : {}), notes: row.payload?.notes ?? "" }));
    }).catch(() => toast.error("Não foi possível carregar o pré-cadastro."));
  }, [routeSearch.action, routeSearch.intake, canCreate, navigate, fetchIntakes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (name.length < 2) throw new Error("Informe o nome do evento.");
      if (!form.client_id) throw new Error("Selecione o cliente do evento.");
      if (!form.event_date) throw new Error("Informe a data do evento.");

      if (form.duration_hours && (!durationMinutes || !form.start_time)) throw new Error("Informe início e duração válida (até 23h59).");
      if (form.start_time && !durationMinutes && !editing) throw new Error("Informe a duração do evento.");
      const contracted = parseCurrencyInput(form.contracted_value);

      const payload = {
        client_id: form.client_id,
        service_id: form.service_id || null,
        name,
        event_type: form.event_type.trim() || null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: computedEnd?.time ?? (form.end_time || null),
        duration_minutes: durationMinutes,
        venue_city: form.venue_city.trim() || null, venue_state: form.venue_state.trim().toUpperCase() || null,
        latitude: form.latitude, longitude: form.longitude, place_id: form.place_id,
        preregistration_id: intakeId,
        venue: form.venue.trim() || null,
        address: form.address.trim() || null,
        has_ceremonial: form.has_ceremonial,
        ceremonial_name: form.has_ceremonial ? form.ceremonial_name.trim() || null : null,
        ceremonial_contact: form.has_ceremonial ? form.ceremonial_contact.trim() || null : null,
        contact_via_ceremonial: form.has_ceremonial ? form.contact_via_ceremonial : false,
        has_guestbook: form.has_guestbook,
        attraction_id: form.attraction_id || null,
        attraction_start_location: form.attraction_start_location.trim() || null,
        guest_count: parseGuestCount(form.guest_count),
        social_media_consent: form.social_media_consent,
        instagram_handles: form.social_media_consent ? form.instagram_handles.trim() || null : null,
        referral_source: (form.referral_source || null) as ReferralSource | null,
        referral_other: form.referral_source === "outro" ? form.referral_other.trim() || null : null,
        status: form.status,
        contracted_value: contracted,
        notes: form.notes.trim() || null,
      };

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id ?? null;

      const result = await saveDetails({ data: { id: editing?.id ?? null, draft: payload } });
      const eventId = result.id;

      // Sincroniza a equipe (colaboradores) vinculada ao evento.
      const previous = editing ? (eventTeams.data?.[editing.id] ?? []).map((m) => m.id) : [];
      const toRemove = previous.filter((id) => !teamIds.includes(id));
      const toAdd = teamIds.filter((id) => !previous.includes(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("event_collaborators")
          .delete()
          .eq("event_id", eventId)
          .in("collaborator_id", toRemove);
        if (error) throw new Error("Não foi possível atualizar a equipe do evento.");
      }

      if (toAdd.length > 0) {
        const { error } = await supabase.from("event_collaborators").insert(
          toAdd.map((collaboratorId) => ({
            event_id: eventId,
            collaborator_id: collaboratorId,
            created_by: currentUserId,
            agreed_value: parseCurrencyInput(teamValues[collaboratorId]?.agreed ?? ""),
            paid_value: parseCurrencyInput(teamValues[collaboratorId]?.paid ?? ""),
          })),
        );
        if (error) throw new Error("Não foi possível vincular os colaboradores ao evento.");
      }

      // Atualiza os valores combinados/pagos de quem já estava na escala.
      const toUpdate = teamIds.filter((id) => previous.includes(id));
      for (const collaboratorId of toUpdate) {
        const { error } = await supabase
          .from("event_collaborators")
          .update({
            agreed_value: parseCurrencyInput(teamValues[collaboratorId]?.agreed ?? ""),
            paid_value: parseCurrencyInput(teamValues[collaboratorId]?.paid ?? ""),
          })
          .eq("event_id", eventId)
          .eq("collaborator_id", collaboratorId);
        if (error) throw new Error("Não foi possível salvar os valores da equipe.");
      }

      const paymentRows = payments
        .map((p) => ({ amount: parseCurrencyInput(p.amount), paid_at: p.paid_at, method: p.method }))
        .filter((p) => p.amount > 0);
      if (paymentRows.some((p) => !p.paid_at)) throw new Error("Informe a data de cada recebimento.");
      const { error: delPayError } = await supabase.from("event_payments").delete().eq("event_id", eventId);
      if (delPayError) throw new Error("Não foi possível atualizar os recebimentos.");
      if (paymentRows.length) {
        const { error: payError } = await supabase
          .from("event_payments")
          .insert(paymentRows.map((p) => ({ ...p, event_id: eventId, created_by: currentUserId })));
        if (payError) throw new Error("Não foi possível salvar os recebimentos.");
      }

      for (const pending of pendingAttachments) {
        const storagePath = `${eventId}/${pending.category}/${safeFileName(pending.file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .upload(
            storagePath,
            pending.file,
            pending.file.type ? { contentType: pending.file.type } : {},
          );
        if (uploadError) throw new Error(`Não foi possível enviar ${pending.file.name}.`);

        const { error: recordError } = await supabase.from("event_attachments").insert({
          event_id: eventId,
          category: pending.category,
          original_name: pending.file.name,
          storage_path: storagePath,
          mime_type: pending.file.type || null,
          size_bytes: pending.file.size,
          created_by: currentUserId,
        });
        if (recordError) {
          await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
          throw new Error(`Não foi possível registrar ${pending.file.name}.`);
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Evento atualizado." : "Evento cadastrado.");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyEventForm);
      setTeamIds([]);
      setTeamValues({});
      setPayments([]);
      setPendingAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-attachments"] });
      queryClient.invalidateQueries({ queryKey: ["client-intakes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Preserve history: events are cancelled, never physically deleted.
      const { error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", id);
      if (error) throw new Error("Não foi possível cancelar o evento.");
    },
    onSuccess: () => {
      toast.success("Evento cancelado. O histórico foi preservado.");
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachment: EventAttachment) => {
      const { error: storageError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove([attachment.storage_path]);
      if (storageError) throw new Error("Não foi possível remover o arquivo.");
      const { error } = await supabase.from("event_attachments").delete().eq("id", attachment.id);
      if (error) throw new Error("O arquivo foi removido, mas não foi possível atualizar sua lista.");
    },
    onSuccess: () => {
      toast.success("Anexo excluído.");
      queryClient.invalidateQueries({ queryKey: ["event-attachments"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function addAttachments(category: AttachmentCategory, files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const tooLarge = selected.filter((file) => file.size > MAX_ATTACHMENT_SIZE);
    if (tooLarge.length > 0) {
      toast.error(`${tooLarge.length === 1 ? "O arquivo excede" : "Alguns arquivos excedem"} o limite de 20 MB.`);
    }
    setPendingAttachments((current) => [
      ...current,
      ...selected
        .filter((file) => file.size <= MAX_ATTACHMENT_SIZE)
        .map((file) => ({ id: crypto.randomUUID(), category, file })),
    ]);
  }

  async function downloadAttachment(attachment: EventAttachment) {
    const { data, error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(attachment.storage_path, 60, { download: attachment.original_name });
    if (error || !data.signedUrl) {
      toast.error("Não foi possível baixar o arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!canView) {
    return (
      <AppShell>
        <PageHeader title="Eventos" description="Você não tem permissão para visualizar este módulo." />
      </AppShell>
    );
  }

  const receivedTotal = payments.reduce((sum, p) => sum + parseCurrencyInput(p.amount), 0);
  const balance = parseCurrencyInput(form.contracted_value) - receivedTotal;
  function updatePayment(index: number, patch: Partial<PaymentDraft>) {
    setPayments((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <AppShell>
      <PageHeader
        title="Eventos"
        description="Acompanhe cada evento da Magic Moments, do primeiro contato à realização."
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" /> Novo evento
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Eventos listados</p>
            <p className="font-display text-2xl">{showEventInfo ? filtered.length : "•••"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor contratado</p>
            <p className="font-display text-2xl">{showFinancial ? formatCurrency(totals.contracted) : "••••••"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo a receber</p>
            <p className="font-display text-2xl">
              {showFinancial ? formatCurrency(totals.contracted - totals.received) : "••••••"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por evento, cliente, local ou serviço"
              className="pl-9"
              aria-label="Buscar eventos"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as "all" | EventDisplayStatus)}
          >
            <SelectTrigger className="w-44" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(EVENT_DISPLAY_STATUS_LABELS) as EventDisplayStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {EVENT_DISPLAY_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={() => setShowAdvanced(value => !value)}><SlidersHorizontal className="size-4" />Filtros{activeFilters > 0 ? ` (${activeFilters})` : ""}</Button>
          <Button type="button" variant="ghost" size="icon" aria-label={showEventInfo ? "Ocultar informações dos eventos" : "Mostrar informações dos eventos"} title={showEventInfo ? "Ocultar eventos" : "Mostrar eventos"} onClick={() => setShowEventInfo(value => !value)}>{showEventInfo ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</Button>
          <Button type="button" variant="ghost" size="icon" aria-label={showFinancial ? "Ocultar valores financeiros" : "Mostrar valores financeiros"} title={showFinancial ? "Ocultar valores" : "Mostrar valores"} onClick={() => setShowFinancial(value => !value)}>{showFinancial ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</Button>
          {showAdvanced && <div className="grid basis-full gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="filter-start">Data inicial</Label><PickerField id="filter-start" variant="date" value={dateStart} onChange={event => setDateStart(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="filter-end">Data final</Label><PickerField id="filter-end" variant="date" value={dateEnd} onChange={event => setDateEnd(event.target.value)} /></div>
            <div className="space-y-2"><Label>Serviço</Label><Select value={serviceFilter} onValueChange={setServiceFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os serviços</SelectItem>{services.data?.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Cliente</Label><Select value={clientFilter} onValueChange={setClientFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clients.data?.map(item => <SelectItem key={item.id} value={item.id}>{item.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Situação financeira</Label><Select value={financeFilter} onValueChange={value => setFinanceFilter(value as "all" | "pending" | "paid")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="pending">Com saldo a receber</SelectItem><SelectItem value="paid">Quitado</SelectItem></SelectContent></Select></div>
            <div className="flex items-end"><Button type="button" variant="ghost" disabled={!activeFilters && !search} onClick={clearFilters}><X className="size-4" />Limpar filtros</Button></div>
          </div>}
          {activeFilters > 0 && <div className="flex basis-full flex-wrap gap-2">{[
            dateStart && `De ${formatEventDate(dateStart)}`, dateEnd && `Até ${formatEventDate(dateEnd)}`,
            serviceFilter !== "all" && `Serviço: ${services.data?.find(item => item.id === serviceFilter)?.name ?? "Selecionado"}`,
            clientFilter !== "all" && `Cliente: ${clients.data?.find(item => item.id === clientFilter)?.full_name ?? "Selecionado"}`,
            statusFilter !== "all" && EVENT_DISPLAY_STATUS_LABELS[statusFilter],
            financeFilter !== "all" && (financeFilter === "pending" ? "Saldo a receber" : "Quitado"),
          ].filter(Boolean).map(label => <Badge key={String(label)} variant="secondary">{label}</Badge>)}</div>}
          {dateStart && dateEnd && dateStart > dateEnd && <p role="alert" className="basis-full text-sm text-destructive">A data inicial deve ser anterior ou igual à final.</p>}
          <p className="basis-full text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}{activeFilters > 0 ? ` · ${activeFilters} filtros ativos` : ""}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valores</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!events.isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <PartyPopper className="mx-auto mb-3 size-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      {search || activeFilters > 0
                        ? "Nenhum evento encontrado com esses filtros."
                        : "Nenhum evento cadastrado ainda."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <p className="font-medium">{showEventInfo ? event.name : "Evento oculto"}</p>
                    {showEventInfo && <>
                    <p className="text-xs text-muted-foreground">
                      {event.event_type ? `${event.event_type} · ` : ""}
                      {formatTimeRange(event.start_time, event.end_time)}
                    </p>
                    {(eventTeams.data?.[event.id] ?? []).length > 0 && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <HardHat className="size-3" />
                        {(eventTeams.data?.[event.id] ?? []).map((m) => m.name).join(", ")}
                      </p>
                    )}
                    {event.venue && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {event.venue}
                      </p>
                    )}</>}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{showEventInfo ? event.clients?.full_name ?? "—" : "••••••"}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      {showEventInfo ? formatEventDate(event.event_date) : "••/••/••••"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {showEventInfo && event.services ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full ring-2 ring-border"
                          style={{ backgroundColor: event.services.color }}
                          aria-hidden
                        />
                        {event.services.name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const displayStatus = resolveEventStatus(event.status, event.event_date);
                      if (!showEventInfo) return "••••••";
                      return (
                        <Badge variant="outline" className={cn(EVENT_DISPLAY_STATUS_CLASSES[displayStatus])}>
                          {EVENT_DISPLAY_STATUS_LABELS[displayStatus]}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm">
                    <p className="font-medium">{showFinancial ? formatCurrency(Number(event.contracted_value ?? 0)) : "••••••"}</p>
                    <p className="text-xs text-muted-foreground">
                      {showFinancial ? `Recebido ${formatCurrency(Number(event.received_value ?? 0))}` : "Recebido ••••••"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(event)}>
                          <Pencil className="mr-1 size-4" /> Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={showEventInfo ? `Excluir ${event.name}` : "Excluir evento oculto"}
                          onClick={() => setDeleting(event)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {filtered.length > pageSize && <div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Página {Math.min(page, totalPages)} de {totalPages}</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</Button><Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Próxima</Button></div></div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-background p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border px-6 pb-5 pt-6">
            <DialogTitle className="font-display">{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
            <DialogDescription>
              Informações do evento, serviço contratado e valores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5 [&_label]:font-medium">
            <p className="text-xs text-muted-foreground">
              Campos marcados com <span className="text-destructive">*</span> são obrigatórios.
            </p>
            <h2 className="border-b border-border pb-2 font-semibold">Identificação do evento</h2>
            <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="e-name">
                  Título do evento
                  <RequiredMark />
                </Label>
                <Input
                  id="e-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ex.: Casamento Mateus e Isabella"
                  maxLength={200}
                  className={cn(form.name.trim().length < 2 && showErrors && "border-destructive/60")}
                />
                {showErrors && form.name.trim().length < 2 && <p role="alert" className="text-xs text-destructive">Informe o título do evento.</p>}
              </div>
              <div className="space-y-2">
                <Label>
                  Cliente
                  <RequiredMark />
                </Label>
                <Select
                  value={form.client_id}
                  onValueChange={(value) => setForm({ ...form, client_id: value })}
                >
                  <SelectTrigger className={cn(!form.client_id && showErrors && "border-destructive/60")}>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clients.data ?? []).map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de evento</Label>
                <Select
                  value={form.event_type || NONE}
                  onValueChange={(value) =>
                    setForm({ ...form, event_type: value === NONE ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não informado</SelectItem>
                    {EVENT_TYPE_SUGGESTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select
                  value={form.service_id || NONE}
                  onValueChange={(value) =>
                    setForm({ ...form, service_id: value === NONE ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem serviço vinculado</SelectItem>
                    {(services.data ?? []).map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value as EventStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <h2 className="border-b border-border pb-2 pt-3 font-semibold">Data e horário</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="e-date">Data do evento<RequiredMark /></Label><PickerField id="e-date" variant="date" value={form.event_date} onChange={event => setForm({ ...form, event_date: event.target.value })} />{showErrors && !form.event_date && <p role="alert" className="text-xs text-destructive">Informe a data do evento.</p>}</div>
              <div className="space-y-2"><Label htmlFor="e-start">Horário de início</Label><PickerField id="e-start" variant="time" value={form.start_time} onChange={event => setForm({ ...form, start_time: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="e-duration">Duração (horas)</Label><Input id="e-duration" inputMode="decimal" list="event-durations" value={form.duration_hours} onChange={event => setForm({ ...form, duration_hours: event.target.value })} placeholder="Ex.: 4 ou 2,5" /><datalist id="event-durations">{[2,3,4,5,6].map(hours => <option key={hours} value={hours}>{hours} horas</option>)}</datalist>{form.duration_hours && !durationMinutes && <p role="alert" className="text-xs text-destructive">Informe duração de 1 minuto a 23h59.</p>}</div>
            </div>
            <div className="border-l-2 border-primary bg-muted px-4 py-3"><p className="text-xs text-muted-foreground">Término calculado</p><output id="e-end" className="mt-1 block font-semibold">{computedEnd ? `${computedEnd.time}${computedEnd.nextDay ? " · dia seguinte" : ""}` : editing?.end_time ? `${editing.end_time.slice(0,5)} · horário histórico; revise a duração` : "A definir"}</output></div>
            <h2 className="border-b border-border pb-2 pt-3 font-semibold">Localização</h2>
            <div className="space-y-2"><Label htmlFor="e-venue">Local do evento</Label><TravelPlaceInput id="e-venue" required={false} value={form.venue} placeholder="Busque um salão, chácara, hotel ou endereço" onChange={value => setForm({ ...form, venue: value, place_id: null, latitude: null, longitude: null })} onSelect={place => setForm(current => ({ ...current, venue: place.name || place.address, address: place.address, venue_city: place.city, venue_state: place.state, latitude: place.latitude, longitude: place.longitude, place_id: place.placeId }))} /></div>
            <div className="space-y-2"><Label htmlFor="e-address">Endereço completo</Label><Input id="e-address" maxLength={1000} value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} placeholder="Rua, número, bairro e complemento" /></div>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]"><div className="space-y-2"><Label htmlFor="e-city">Cidade</Label><Input id="e-city" maxLength={150} value={form.venue_city} onChange={event => setForm({ ...form, venue_city: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="e-state">UF</Label><Input id="e-state" maxLength={2} value={form.venue_state} onChange={event => setForm({ ...form, venue_state: event.target.value.toUpperCase() })} /></div></div>
            {editing && form.address && <Button variant="outline" size="sm" asChild><Link to="/deslocamento" search={{ event: editing.id }}><MapPin className="size-4" />Calcular deslocamento</Link></Button>}
            <h2 className="border-b border-border pb-2 pt-3 font-semibold">Informações operacionais</h2>

            <div className="space-y-4 rounded-lg border border-primary/10 bg-primary-soft/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="e-has-ceremonial" className="text-sm font-medium">
                    Possui cerimonial?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Indique se o evento conta com cerimonialista.
                  </p>
                </div>
                <Switch
                  id="e-has-ceremonial"
                  checked={form.has_ceremonial}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      has_ceremonial: checked,
                      ...(checked
                        ? {}
                        : { ceremonial_name: "", ceremonial_contact: "", contact_via_ceremonial: false }),
                    })
                  }
                />
              </div>

              {form.has_ceremonial && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="e-ceremonial-name">Nome do cerimonial</Label>
                      <Input
                        id="e-ceremonial-name"
                        value={form.ceremonial_name}
                        onChange={(event) =>
                          setForm({ ...form, ceremonial_name: event.target.value })
                        }
                        placeholder="Ex.: Ana Paula Cerimonial"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="e-ceremonial-contact">Contato do cerimonial</Label>
                      <Input
                        id="e-ceremonial-contact"
                        value={form.ceremonial_contact}
                        onChange={(event) =>
                          setForm({ ...form, ceremonial_contact: event.target.value })
                        }
                        placeholder="Telefone ou e-mail"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="e-contact-via" className="text-sm font-medium">
                        Contato direto com a cerimonialista
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Combine os detalhes diretamente com o cerimonial, sem passar pelo cliente.
                      </p>
                    </div>
                    <Switch
                      id="e-contact-via"
                      checked={form.contact_via_ceremonial}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, contact_via_ceremonial: checked })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-accent/40 bg-accent/10 p-4 transition-colors hover:border-accent/60">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/25 text-accent-foreground">
                  <BookHeart className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <Label htmlFor="e-has-guestbook" className="text-sm font-medium">
                    Caderno de Memórias (Guestbook)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marque quando este adicional fizer parte do evento.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {form.has_guestbook ? "Sim" : "Não"}
                </span>
                <Switch
                  id="e-has-guestbook"
                  checked={form.has_guestbook}
                  onCheckedChange={(checked) => setForm({ ...form, has_guestbook: checked })}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <EventExtraFields idPrefix="e" value={form} onChange={(next) => setForm({ ...form, ...next })} />
            </div>

            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HardHat className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <Label className="text-sm font-medium">Equipe do evento</Label>
                  <p className="text-xs text-muted-foreground">
                    Selecione os colaboradores que vão operar neste evento.
                  </p>
                </div>
              </div>

              {(collaborators.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum colaborador ativo cadastrado. Cadastre em Colaboradores.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(collaborators.data ?? []).map((member) => {
                    const selected = teamIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() =>
                          setTeamIds((current) =>
                            current.includes(member.id)
                              ? current.filter((id) => id !== member.id)
                              : [...current, member.id],
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-card/70 text-foreground hover:border-primary/50",
                        )}
                        aria-pressed={selected}
                      >
                        {member.nickname || member.full_name}
                        {member.role_title ? ` · ${member.role_title}` : ""}
                      </button>
                    );
                  })}
                </div>
              )}

              {teamIds.length > 0 && (
                <div className="space-y-3 rounded-lg border border-border/60 bg-card/70 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Valores por colaborador (combinado e já pago)
                  </p>
                  {teamIds.map((id) => {
                    const member = (collaborators.data ?? []).find((c) => c.id === id);
                    const values = teamValues[id] ?? { agreed: "", paid: "" };
                    const memberBalance =
                      parseCurrencyInput(values.agreed) - parseCurrencyInput(values.paid);
                    return (
                      <div key={id} className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                        <p className="truncate text-sm">{member?.nickname || member?.full_name || "—"}</p>
                        <div className="space-y-1">
                          <Label htmlFor={`t-agreed-${id}`} className="text-xs">
                            Combinado (R$)
                          </Label>
                          <Input
                            id={`t-agreed-${id}`}
                            inputMode="decimal"
                            className="sm:w-32"
                            value={values.agreed}
                            onChange={(event) =>
                              setTeamValues((current) => ({
                                ...current,
                                [id]: { ...values, agreed: event.target.value },
                              }))
                            }
                            placeholder="0,00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`t-paid-${id}`} className="text-xs">
                            Pago (R$)
                          </Label>
                          <Input
                            id={`t-paid-${id}`}
                            inputMode="decimal"
                            className="sm:w-32"
                            value={values.paid}
                            onChange={(event) =>
                              setTeamValues((current) => ({
                                ...current,
                                [id]: { ...values, paid: event.target.value },
                              }))
                            }
                            placeholder="0,00"
                          />
                        </div>
                        <p className="pb-3 text-xs text-muted-foreground sm:w-28 sm:text-right">
                          A pagar {formatCurrency(memberBalance)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="e-contracted">Valor contratado (R$)</Label>
                <Input
                  id="e-contracted"
                  inputMode="decimal"
                  value={form.contracted_value}
                  onChange={(event) => setForm({ ...form, contracted_value: event.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor recebido (total)</Label>
                <div className="flex h-11 items-center rounded-lg border border-input bg-muted/40 px-3.5 text-sm font-medium">
                  {formatCurrency(receivedTotal)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Saldo</Label>
                <div className="flex h-11 items-center rounded-lg border border-input bg-muted/40 px-3.5 text-sm font-medium">
                  {formatCurrency(balance)}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Recebimentos</p>
                  <p className="text-xs text-muted-foreground">Cada pagamento do cliente com data e forma.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPayments((list) => [...list, { amount: "", paid_at: todayIso(), method: "pix" }])
                  }
                >
                  <Plus className="mr-1 size-4" /> Adicionar
                </Button>
              </div>
              {payments.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum recebimento registrado.</p>
              )}
              {payments.map((payment, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, { amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={payment.paid_at}
                      onChange={(e) => updatePayment(index, { paid_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Forma</Label>
                    <Select
                      value={payment.method}
                      onValueChange={(value) => updatePayment(index, { method: value as PaymentMethod })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.filter(
                          (m) => m.value !== "previous_balance" || payment.method === "previous_balance",
                        ).map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover recebimento"
                    onClick={() => setPayments((list) => list.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>


            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  {
                    category: "receipt" as const,
                    title: "Comprovantes",
                    description: "Comprovantes de pagamentos e transferências.",
                    icon: ReceiptText,
                    inputRef: receiptInputRef,
                  },
                  {
                    category: "document" as const,
                    title: "Contratos e documentos",
                    description: "Contratos e outros documentos do evento.",
                    icon: FileText,
                    inputRef: documentInputRef,
                  },
                ]
              ).map((group) => {
                const Icon = group.icon;
                const saved = editing
                  ? (attachments.data ?? []).filter(
                      (attachment) =>
                        attachment.event_id === editing.id && attachment.category === group.category,
                    )
                  : [];
                const pending = pendingAttachments.filter(
                  (attachment) => attachment.category === group.category,
                );
                return (
                  <section key={group.category} className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Label className="text-sm font-medium">{group.title}</Label>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                    </div>

                    <input
                      ref={group.inputRef}
                      type="file"
                      multiple
                      className="sr-only"
                      aria-label={`Selecionar ${group.title.toLowerCase()}`}
                      onChange={(event) => {
                        addAttachments(group.category, event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => group.inputRef.current?.click()}
                    >
                      <Upload className="size-4" /> Adicionar arquivos
                    </Button>
                    <p className="text-xs text-muted-foreground">Vários arquivos, até 20 MB cada.</p>

                    {(saved.length > 0 || pending.length > 0) && (
                      <ul className="space-y-2" aria-label={`Arquivos de ${group.title.toLowerCase()}`}>
                        {saved.map((attachment) => (
                          <li key={attachment.id} className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">{attachment.original_name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size_bytes)}</p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" aria-label={`Baixar ${attachment.original_name}`} onClick={() => downloadAttachment(attachment)}>
                              <Download className="size-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Excluir ${attachment.original_name}`}
                                disabled={deleteAttachmentMutation.isPending}
                                onClick={() => deleteAttachmentMutation.mutate(attachment)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            )}
                          </li>
                        ))}
                        {pending.map((attachment) => (
                          <li key={attachment.id} className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                            <FileText className="size-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">{attachment.file.name}</p>
                              <p className="text-xs text-muted-foreground">Novo · {formatFileSize(attachment.file.size)}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remover ${attachment.file.name}`}
                              onClick={() =>
                                setPendingAttachments((current) =>
                                  current.filter((item) => item.id !== attachment.id),
                                )
                              }
                            >
                              <X className="size-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>


            <div className="space-y-2">
              <Label htmlFor="e-notes">Observações</Label>
              <Textarea
                id="e-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Detalhes operacionais, combinados com o cliente, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xl">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setShowErrors(true);
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleting?.name}</strong>? Essa ação não pode ser
              desfeita. Os compromissos de montagem, chegada e outros vinculados a este evento também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
