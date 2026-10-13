import * as React from "react";
import { CalendarDays, Clock } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isoDate } from "@/lib/client-intake";
import { eventTimeSchema } from "@/lib/event-timing";

interface PickerFieldProps extends React.ComponentProps<"input"> { variant: "date" | "time" }
const displayDate = (value: string) => value ? value.split("-").reverse().join("/") : "";
export function PickerField({ variant, className, value, onChange, ...props }: PickerFieldProps) {
  const iso = typeof value === "string" ? value : "";
  const [draft, setDraft] = React.useState(variant === "date" ? displayDate(iso) : iso);
  const [error, setError] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const lastEmitted = React.useRef<string | null>(null);
  React.useEffect(() => { if (lastEmitted.current === iso) { lastEmitted.current = null; return; } setDraft(variant === "date" ? displayDate(iso) : iso); setError(""); }, [iso, variant]);
  function emit(next: string) {
    lastEmitted.current = next;
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as React.ChangeEvent<HTMLInputElement>);
  }
  function change(text: string) {
    setDraft(text);
    if (!text) { setError(""); emit(""); return; }
    const result = variant === "date" ? text.split("/").reverse().join("-") : text;
    if ((variant === "date" ? isoDate : eventTimeSchema).safeParse(result).success) { setError(""); emit(result); }
    else { setError(variant === "date" ? "Informe uma data válida no formato DD/MM/AAAA." : "Informe um horário válido no formato HH:mm."); emit(""); }
  }
  const selected = isoDate.safeParse(iso).success ? new Date(`${iso}T12:00:00`) : undefined;
  return <div className="min-w-0">
    <div className={cn("flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20", className)}>
      {variant === "time" && <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />}
      <input {...props} type="text" value={draft} inputMode="numeric" maxLength={variant === "date" ? 10 : 5} placeholder={variant === "date" ? "DD/MM/AAAA" : "HH:mm"} list={variant === "time" ? `${props.id}-hours` : undefined} className="min-w-0 flex-1 bg-transparent outline-none" aria-invalid={Boolean(error)} onChange={event => change(event.target.value)} />
      {variant === "date" && <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Abrir calendário" disabled={props.disabled}><CalendarDays className="size-4 text-primary" /></Button></PopoverTrigger><PopoverContent align="end" className="w-auto p-0"><Calendar mode="single" locale={ptBR} selected={selected} {...(selected ? { defaultMonth: selected } : {})} captionLayout="dropdown" startMonth={new Date(1920,0)} endMonth={new Date(2100,11)} onSelect={date => { if (!date) return; const next = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; setDraft(displayDate(next)); setError(""); emit(next); setOpen(false); }} /></PopoverContent></Popover>}
    </div>
    {variant === "time" && <datalist id={`${props.id}-hours`}>{Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index/2)).padStart(2,"0")}:${index%2 ? "30" : "00"}`).map(time => <option key={time} value={time} />)}</datalist>}
    {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
  </div>;
}