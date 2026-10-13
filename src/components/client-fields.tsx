import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCpf, formatPhone, formatZip, lookupZipCode, onlyDigits, type ClientForm } from "@/lib/clients";

type Props = { value: Omit<ClientForm, "phone">; onChange: (value: Omit<ClientForm, "phone">) => void; errors?: Record<string, string>; publicForm?: boolean; prefix?: string; showNotes?: boolean };
export function ClientFields({ value, onChange, errors = {}, publicForm = false, prefix = "c", showNotes = true }: Props) {
  const [zipBusy, setZipBusy] = useState(false);
  const [zipMessage, setZipMessage] = useState("");
  const latest = useRef(value); latest.current = value;
  const version = useRef(0);
  async function findZip() {
    const zip = onlyDigits(value.zip_code);
    if (zip.length !== 8) return;
    const current = ++version.current;
    setZipBusy(true); setZipMessage("");
    const address = await lookupZipCode(zip);
    if (current !== version.current) return;
    setZipBusy(false);
    if (onlyDigits(latest.current.zip_code) !== zip) return;
    if (!address) { setZipMessage("CEP não encontrado. Preencha o endereço manualmente."); return; }
    onChange({ ...latest.current, ...Object.fromEntries(Object.entries(address).filter(([, item]) => item)) });
  }
  const field = (key: keyof Omit<ClientForm, "phone">, label: string, maxLength: number, options: { required?: boolean; placeholder?: string; type?: string; autoComplete?: string; mask?: (value: string) => string } = {}) => (
    <div className="min-w-0 space-y-2" key={key}>
      <Label htmlFor={`${prefix}-${key}`}>{label}{options.required && <span className="text-destructive"> *</span>}</Label>
      <Input id={`${prefix}-${key}`} value={value[key]} maxLength={maxLength} type={options.type ?? "text"} placeholder={options.placeholder} autoComplete={options.autoComplete} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${prefix}-${key}-error` : undefined}
        inputMode={["cpf", "zip_code", "whatsapp"].includes(key) ? "numeric" : undefined}
        onChange={event => onChange({ ...value, [key]: options.mask ? options.mask(event.target.value) : event.target.value })} onBlur={key === "zip_code" ? () => void findZip() : undefined} />
      {errors[key] && <p id={`${prefix}-${key}-error`} role="alert" className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );
  return <div className="space-y-7">
    <section className="space-y-4"><h2 className="border-b border-border pb-2 font-semibold">Dados pessoais</h2>
      {field("full_name", "Nome completo", 150, { required: true, autoComplete: "name" })}
      <div className="grid gap-4 sm:grid-cols-3">
        {field("birth_date", "Data de nascimento", 10, { type: "date", autoComplete: "bday" })}
        {field("cpf", "CPF", 14, { required: publicForm, mask: formatCpf, placeholder: "000.000.000-00" })}
        {field("rg", "RG", 20)}
      </div>
    </section>
    <section className="space-y-4"><h2 className="border-b border-border pb-2 font-semibold">Informações de contato</h2>
      <div className="grid gap-4 sm:grid-cols-2">{field("whatsapp", "WhatsApp", 16, { required: publicForm, mask: formatPhone, placeholder: "(11) 91234-5678", autoComplete: "tel-national" })}{field("email", "E-mail", 255, { required: publicForm, type: "email", autoComplete: "email" })}</div>
    </section>
    <section className="space-y-4"><h2 className="border-b border-border pb-2 font-semibold">Endereço</h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">{field("zip_code", "CEP", 9, { mask: formatZip, placeholder: "00000-000", autoComplete: "postal-code" })}{field("address", "Endereço", 300, { autoComplete: "street-address" })}</div>
      {(zipBusy || zipMessage) && <p role="status" className="text-xs text-muted-foreground">{zipBusy ? "Buscando endereço…" : zipMessage}</p>}
      <div className="grid gap-4 sm:grid-cols-3">{field("address_number", "Número", 30)}{field("address_complement", "Complemento", 150)}{field("neighborhood", "Bairro", 150)}</div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">{field("city", "Cidade", 150, { autoComplete: "address-level2" })}{field("state", "UF", 2, { mask: input => input.replace(/[^a-zA-Z]/g, "").toUpperCase(), autoComplete: "address-level1" })}</div>
    </section>
    {showNotes && <section className="space-y-2"><Label htmlFor={`${prefix}-notes`}>Observações</Label><Textarea id={`${prefix}-notes`} rows={3} maxLength={5000} value={value.notes} onChange={event => onChange({ ...value, notes: event.target.value })} />{errors["notes"] && <p role="alert" className="text-xs text-destructive">{errors["notes"]}</p>}</section>}
  </div>;
}