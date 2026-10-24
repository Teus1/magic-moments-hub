export type EventStatus = "planned" | "cancelled";

/** Status exibido: "Realizado" é derivado de um evento planejado cuja data já passou. */
export type EventDisplayStatus = "planned" | "done" | "cancelled";

export function resolveEventStatus(
  status: EventStatus,
  eventDate: string | null,
): EventDisplayStatus {
  if (status === "cancelled") return "cancelled";
  if (!eventDate) return "planned";
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return eventDate < `${yyyy}-${mm}-${dd}` ? "done" : "planned";
}

export interface EventForm {
  client_id: string;
  service_id: string;
  name: string;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  duration_hours: string;
  venue_city: string;
  venue_state: string;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  venue: string;
  address: string;
  has_ceremonial: boolean;
  ceremonial_name: string;
  ceremonial_contact: string;
  contact_via_ceremonial: boolean;
  has_guestbook: boolean;
  attraction_id: string;
  attraction_start_location: string;
  guest_count: string;
  social_media_consent: boolean | null;
  instagram_handles: string;
  referral_source: string;
  referral_other: string;
  status: EventStatus;
  contracted_value: string;
  received_value: string;
  notes: string;
  team: EventTeamMember[];
}

export interface EventTeamMember {
  collaborator_id: string;
  agreed_value: string;
  service_paid_value: string;
  transport_paid_value: string;
  is_transport_responsible: boolean;
  transport_value: string;
}

export const emptyEventForm: EventForm = {
  client_id: "",
  service_id: "",
  name: "",
  event_type: "",
  event_date: "",
  start_time: "",
  end_time: "",
  duration_hours: "",
  venue_city: "",
  venue_state: "",
  latitude: null,
  longitude: null,
  place_id: null,
  venue: "",
  address: "",
  has_ceremonial: false,
  ceremonial_name: "",
  ceremonial_contact: "",
  contact_via_ceremonial: false,
  has_guestbook: false,
  attraction_id: "",
  attraction_start_location: "",
  guest_count: "",
  social_media_consent: null,
  instagram_handles: "",
  referral_source: "",
  referral_other: "",
  status: "planned",
  contracted_value: "",
  received_value: "",
  notes: "",
  team: [],
};

export const EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "planned", label: "Planejado" },
  { value: "cancelled", label: "Cancelado" },
];

export const EVENT_DISPLAY_STATUS_LABELS: Record<EventDisplayStatus, string> = {
  planned: "Planejado",
  done: "Realizado",
  cancelled: "Cancelado",
};

/** Classes usando apenas tokens do design system da marca. */
export const EVENT_DISPLAY_STATUS_CLASSES: Record<EventDisplayStatus, string> = {
  planned: "border-primary/30 bg-primary/10 text-primary",
  done: "border-success/40 bg-success/10 text-success",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const EVENT_TYPE_SUGGESTIONS = [
  "Aniversário",
  "Casamento",
  "Formatura",
  "Corporativo",
  "Chá de bebê",
  "Debutante",
  "Outro",
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

/** Converte texto digitado ("1.500,50" ou "1500.5") em número. */
export function parseCurrencyInput(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatEventDate(iso: string | null) {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function formatTimeRange(start: string | null, end: string | null) {
  const clean = (value: string | null) => (value ? value.slice(0, 5) : null);
  const s = clean(start);
  const e = clean(end);
  if (s && e) return `${s} às ${e}`;
  if (s) return `a partir de ${s}`;
  if (e) return `até ${e}`;
  return "Horário a definir";
}
