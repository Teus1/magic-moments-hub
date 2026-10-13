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
export const intakeSchema = clientSchema.extend({
  cpf: text(14).refine(validCpf, "Informe um CPF válido."),
  whatsapp: text(20).refine(value => /^\d{10,11}$/.test(onlyDigits(value)), "Informe DDD e número do WhatsApp."),
  email: text(255).email("Informe um e-mail válido."),
  event_title: text(200).min(2, "Informe o título do evento."),
  event_type: text(100), event_date: optionalDate,
  consent: z.literal(true, { errorMap: () => ({ message: "Autorize o uso dos dados para atendimento e contratação." }) }),
});
export type IntakeDraft = z.infer<typeof intakeSchema>;
export interface IntakeRow {
  id: string; status: "pending" | "received" | "reviewed"; client_id: string | null; event_id: string | null;
  payload: IntakeDraft | null; created_at: string; received_at: string | null; reviewed_at: string | null; expires_at: string;
}
export function clientPayload(input: z.infer<typeof clientSchema>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value || null])) as {
    full_name: string; birth_date: string | null; cpf: string | null; rg: string | null; whatsapp: string | null;
    email: string | null; zip_code: string | null; address: string | null; address_number: string | null;
    address_complement: string | null; neighborhood: string | null; city: string | null; state: string | null; notes: string | null;
  };
}