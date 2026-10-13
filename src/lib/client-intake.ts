import { z } from "zod";
import { onlyDigits } from "@/lib/clients";

export function validCpf(value: string) {
  const digits = onlyDigits(value);
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    const sum = digits.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const result = (sum * 10) % 11;
    return Number(digits[length]) === (result === 10 ? 0 : result);
  };
  return check(9) && check(10);
}
export const isoDate = z.string().refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Informe uma data válida.");
const optionalDate = z.union([z.literal(""), isoDate]);
const text = (max: number) => z.string().trim().max(max, `Use até ${max} caracteres.`);
export const clientSchema = z.object({
  full_name: text(150).min(2, "Informe o nome completo."),
  birth_date: optionalDate,
  cpf: text(14).refine(value => !value || validCpf(value), "Informe um CPF válido."),
  rg: text(20),
  whatsapp: text(20).refine(value => !value || /^\d{10,11}$/.test(onlyDigits(value)), "Informe DDD e número do WhatsApp."),
  email: z.union([z.literal(""), text(255).email("Informe um e-mail válido.")]),
  zip_code: text(9).refine(value => !value || /^\d{8}$/.test(onlyDigits(value)), "Informe os 8 dígitos do CEP."),
  address: text(300), address_number: text(30), address_complement: text(150),
  neighborhood: text(150), city: text(150), state: text(2).refine(value => !value || /^[A-Z]{2}$/.test(value), "Informe a UF com duas letras."),
  notes: text(5000),
});
export const intakeEventSchema = z.object({
  start_time: z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o horário no formato 24h.")]),
  duration_minutes: z.number().int().min(1, "Informe a duração.").max(1439, "Duração máxima de 23h59.").nullable(),
  venue: text(300), address: text(500), venue_city: text(150), venue_state: text(2),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(), place_id: text(300).nullable(),
  attraction_id: z.union([z.literal(""), z.string().uuid()]),
  has_ceremonial: z.boolean(), ceremonial_name: text(150), ceremonial_contact: text(150), contact_via_ceremonial: z.boolean(),
  has_guestbook: z.boolean(),
});
export type IntakeEvent = z.infer<typeof intakeEventSchema>;
export const emptyIntakeEvent: IntakeEvent = { start_time: "", duration_minutes: null, venue: "", address: "", venue_city: "", venue_state: "", latitude: null, longitude: null, place_id: null, attraction_id: "", has_ceremonial: false, ceremonial_name: "", ceremonial_contact: "", contact_via_ceremonial: false, has_guestbook: false };
export const intakeSchema = clientSchema.extend({
  cpf: text(14).refine(validCpf, "Informe um CPF válido."),
  whatsapp: text(20).refine(value => /^\d{10,11}$/.test(onlyDigits(value)), "Informe DDD e número do WhatsApp."),
  email: text(255).email("Informe um e-mail válido."),
  event_title: text(200).min(2, "Informe o título do evento."),
  event_type: text(100), event_date: optionalDate,
  event: intakeEventSchema.optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Autorize o uso dos dados para atendimento e contratação." }) }),
});
export type IntakeDraft = z.infer<typeof intakeSchema>;
export interface IntakeRow {
  id: string; recipient_name: string | null; status: "pending" | "received" | "reviewed"; client_id: string | null; event_id: string | null;
  payload: IntakeDraft | null; created_at: string; received_at: string | null; reviewed_at: string | null; expires_at: string; notified_at: string | null;
}
/** Mensagem curta, sem CPF nem endereço, para avisar a equipe de uma nova ficha. */
export function intakeNotificationMessage(payload: Pick<IntakeDraft, "full_name" | "event_title" | "event_date">, url: string) {
  const date = payload.event_date ? payload.event_date.split("-").reverse().join("/") : "data a definir";
  return `Nova ficha de contrato recebida: ${payload.full_name} — ${payload.event_title} (${date}). Revise em ${url}`;
}
export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${onlyDigits(phone)}?text=${encodeURIComponent(message)}`;
}
/** Normaliza para DDI 55 + DDD + número; retorna null se inválido. */
export function normalizeRecipientPhone(value: string) {
  const digits = onlyDigits(value);
  const full = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^\d{12,13}$/.test(full) ? full : null;
}
export function clientPayload(input: z.infer<typeof clientSchema>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value || null])) as {
    full_name: string; birth_date: string | null; cpf: string | null; rg: string | null; whatsapp: string | null;
    email: string | null; zip_code: string | null; address: string | null; address_number: string | null;
    address_complement: string | null; neighborhood: string | null; city: string | null; state: string | null; notes: string | null;
  };
}