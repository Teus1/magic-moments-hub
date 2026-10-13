import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ClientFields } from "@/components/client-fields";
import { emptyClientForm } from "@/lib/clients";
import { intakeSchema } from "@/lib/client-intake";
import { intakeLinkStatus, submitIntake } from "@/lib/client-intake.functions";
import { EVENT_TYPE_SUGGESTIONS } from "@/lib/events";
import { PickerField } from "@/components/ui/picker-field";

export const Route = createFileRoute("/pre-cadastro")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search["token"] === "string" && /^[a-f0-9]{64}$/.test(search["token"]) ? search["token"] : "" }),
  head: () => ({ meta: [{ title: "Pré-cadastro — Magic Moments" }, { name: "description", content: "Envie seus dados com segurança para o atendimento e a preparação do seu contrato Magic Moments." }, { property: "og:title", content: "Pré-cadastro — Magic Moments" }, { property: "og:description", content: "Dados para atendimento e preparação do contrato Magic Moments." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" }, { name: "referrer", content: "no-referrer" }] }),
  component: IntakePage,
});
function IntakePage() {
  const { token } = Route.useSearch();
  const statusFn = useServerFn(intakeLinkStatus);
  const submit = useServerFn(submitIntake);
  const status = useQuery({ queryKey: ["intake-link", token], enabled: Boolean(token), retry: false, queryFn: () => statusFn({ data: { token } }) });
  const [form, setForm] = useState(emptyClientForm);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: async () => {
    const checked = intakeSchema.safeParse({ ...form, event_title: eventTitle, event_type: eventType, event_date: eventDate, consent });
    if (!checked.success) { setErrors(Object.fromEntries(checked.error.issues.map(issue => [issue.path[0], issue.message]))); throw new Error("Confira os campos indicados antes de enviar."); }
    setErrors({});
    return submit({ data: { token, draft: checked.data, website: website as "" } });
  } });
  const received = save.isSuccess || status.data?.status === "received";
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-5 py-6"><div className="mx-auto max-w-2xl"><p className="font-display text-3xl text-primary">Magic Moments</p><p className="mt-1 text-sm text-muted-foreground">Pré-cadastro para contratação</p></div></header>
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-10">
      {received ? <section className="space-y-4 py-10"><CheckCircle2 className="size-10 text-success" /><h1 className="font-display text-3xl">Dados recebidos!</h1><p className="text-muted-foreground">A Magic Moments recebeu suas informações e vai utilizá-las para dar continuidade ao atendimento e à preparação do contrato.</p></section>
        : !token || status.data?.status === "expired" ? <section><h1 className="font-display text-2xl">Link inválido ou expirado</h1><p className="mt-3 text-muted-foreground">Solicite um novo link à equipe Magic Moments.</p></section>
        : status.isPending ? <p role="status">Verificando link…</p>
        : status.isError ? <section><p role="alert" className="text-destructive">Não foi possível verificar o link.</p><Button variant="outline" onClick={() => void status.refetch()} className="mt-4">Tentar novamente</Button></section>
        : <form noValidate onSubmit={event => { event.preventDefault(); if (!save.isPending) save.mutate(); }} className="space-y-7">
          <div><h1 className="font-display text-3xl">Seu próximo momento</h1><p className="mt-2 text-sm text-muted-foreground">Campos com <span className="text-destructive">*</span> são obrigatórios.</p></div>
          <ClientFields value={form} onChange={next => setForm(current => ({ ...current, ...next }))} publicForm errors={errors} prefix="intake" showNotes={false} />
          <section className="space-y-4"><h2 className="border-b border-border pb-2 font-semibold">Informações do evento</h2>
            <div className="space-y-2"><Label htmlFor="intake-event-title">Título do evento <span className="text-destructive">*</span></Label><Input id="intake-event-title" placeholder="Ex.: Casamento Mateus e Isabella" maxLength={200} value={eventTitle} onChange={event => setEventTitle(event.target.value)} />{errors["event_title"] && <p role="alert" className="text-xs text-destructive">{errors["event_title"]}</p>}</div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="intake-event-type">Tipo de evento</Label><Input id="intake-event-type" list="event-types" maxLength={100} value={eventType} onChange={event => setEventType(event.target.value)} /><datalist id="event-types">{EVENT_TYPE_SUGGESTIONS.map(type => <option key={type} value={type} />)}</datalist></div><div className="space-y-2"><Label htmlFor="intake-event-date">Data do evento</Label><PickerField id="intake-event-date" variant="date" value={eventDate} onChange={event => setEventDate(event.target.value)} />{errors["event_date"] && <p role="alert" className="text-xs text-destructive">{errors["event_date"]}</p>}</div></div>
          </section>
          <div className="space-y-2"><Label htmlFor="intake-notes">Observações (opcional)</Label><Textarea id="intake-notes" maxLength={5000} rows={3} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div>
          <div className="hidden" aria-hidden="true"><Input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></div>
          <div className="space-y-2 border-t border-border pt-5"><div className="flex items-start gap-3"><Checkbox id="intake-consent" checked={consent} onCheckedChange={value => setConsent(value === true)} /><Label htmlFor="intake-consent" className="text-sm font-normal leading-relaxed">Autorizo a Magic Moments a utilizar estes dados para atendimento e preparação do contrato. O link é pessoal; não compartilhe com terceiros.</Label></div>{errors["consent"] && <p role="alert" className="text-xs text-destructive">{errors["consent"]}</p>}</div>
          {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
          <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto"><Send className="size-4" />{save.isPending ? "Enviando…" : "Enviar dados"}</Button>
        </form>}
    </div>
  </main>;
}