export type EventStatus = "lead" | "confirmed" | "done" | "cancelled";

export interface EventForm {
  client_id: string;
  service_id: string;
  name: string;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  address: string;
  status: EventStatus;
  contracted_value: string;
  received_value: string;
  responsible_id: string;
  notes: string;
}

export const emptyEventForm: EventForm = {
  client_id: "",
  service_id: "",
  name: "",
  event_type: "",
  event_date: "",
  start_time: "",
  end_time: "",
  venue: "",
  address: "",
  status: "lead",
  contracted_value: "",
  received_value: "",
  responsible_id: "",
  notes: "",
};

export const EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "confirmed", label: "Confirmado" },
  { value: "done", label: "Realizado" },
  { value: "cancelled", label: "Cancelado" },
];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  lead: "Lead",
  confirmed: "Confirmado",
  done: "Realizado",
  cancelled: "Cancelado",
};

/** Classes usando apenas tokens do design system da marca. */
export const EVENT_STATUS_CLASSES: Record<EventStatus, string> = {
  lead: "border-primary/30 bg-primary/10 text-primary",
  confirmed: "border-accent/50 bg-accent/15 text-accent-foreground",
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
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
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
