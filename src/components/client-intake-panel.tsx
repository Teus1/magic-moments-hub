import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Link2, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClientFields } from "@/components/client-fields";
import { createIntakeLink, deleteIntakeLink, listIntakes, markIntakeNotified, reviewIntake } from "@/lib/client-intake.functions";
import { clientSchema, intakeNotificationMessage, whatsappLink, type IntakeRow } from "@/lib/client-intake";
import { formatEventDate } from "@/lib/events";
import { emptyClientForm, onlyDigits, type ClientForm } from "@/lib/clients";
import { intakeRecipientSchema, intakeShareUrl } from "@/lib/intake-links";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

type Client = { id: string; full_name: string; cpf: string | null; whatsapp: string | null; email: string | null };
const yes = (value: boolean | undefined) => (value ? "Sim" : "Não");

export function ClientIntakePanel({ clients, canCreate, canEdit, canDelete, canCreateEvent }: { clients: Client[]; canCreate: boolean; canEdit: boolean; canDelete: boolean; canCreateEvent: boolean }) {
  const fetchList = useServerFn(listIntakes); const create = useServerFn(createIntakeLink); const review = useServerFn(reviewIntake); const notified = useServerFn(markIntakeNotified);
  const remove = useServerFn(deleteIntakeLink);
  const [deleting, setDeleting] = useState<IntakeRow | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const cache = useQueryClient();
  const deleted = useMutation({ mutationFn: async () => { if (!deleting) throw new Error("Selecione o link."); return remove({ data: { id: deleting.id } }); }, onSuccess: () => { setDeleting(null); setSelected(null); void cache.invalidateQueries({ queryKey: ["client-intakes"] }); toast.success("Link excluído."); }, onError: error => toast.error(error.message) });
  const intakes = useQuery({ queryKey: ["client-intakes"], queryFn: () => fetchList() });
  const attractions = useQuery({ queryKey: ["attractions"], queryFn: async () => { const r = await supabase.from("attractions").select("id,name,status").order("sort_order").order("name"); if (r.error) throw r.error; return r.data; } });
  const recipients = useQuery({ queryKey: ["whatsapp-recipients"], queryFn: async () => { const r = await supabase.from("whatsapp_notification_recipients").select("id,name,phone,active").eq("active", true).order("name"); if (r.error) throw r.error; return r.data; } });
  const [generating, setGenerating] = useState(false); const [link, setLink] = useState(""); const [linkClient, setLinkClient] = useState("new");
  const [selected, setSelected] = useState<IntakeRow | null>(null); const [target, setTarget] = useState("new"); const [fill, setFill] = useState(false); const [filter, setFilter] = useState("open");
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState<ClientForm>(emptyClientForm); const [errors, setErrors] = useState<Record<string, string>>({});
  const generate = useMutation({ mutationFn: async () => {
    const name = intakeRecipientSchema.safeParse(recipientName);
    if (!name.success) throw new Error("Informe o nome do destinatário.");
    const result = await create({ data: { client_id: linkClient === "new" ? null : linkClient, event_id: null, recipient_name: name.data } });
    return intakeShareUrl(result.token);
  }, onSuccess: url => { setLink(url); void cache.invalidateQueries({ queryKey: ["client-intakes"] }); }, onError: error => toast.error(error.message) });
  const reviewed = useMutation({ mutationFn: () => {
    if (!selected) throw new Error("Selecione a ficha.");
    let corrections;
    if (editing) {
      const parsed = clientSchema.safeParse(Object.fromEntries(Object.keys(clientSchema.shape).map(key => [key, draft[key as keyof ClientForm] ?? ""])));
      if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0], issue.message]))); throw new Error("Confira os campos indicados."); }
      corrections = parsed.data;
    }
    return review({ data: { id: selected.id, client_id: target === "new" ? null : target, fill_missing: fill, ...(corrections ? { corrections } : {}) } });
  }, onSuccess: result => { setEditing(false); setSelected(row => row ? { ...row, status: "reviewed", client_id: result.client_id } : null); void cache.invalidateQueries({ queryKey: ["client-intakes"] }); void cache.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente validado e cadastrado."); }, onError: error => toast.error(error.message) });
  function open(row: IntakeRow) {
    setSelected(row); setFill(false); setEditing(false); setErrors({});
    if (row.payload) setDraft({ ...emptyClientForm, ...Object.fromEntries(Object.entries(row.payload).filter(([, v]) => typeof v === "string")) } as ClientForm);
    const match = clients.find(client => row.payload && (onlyDigits(client.cpf ?? "") === onlyDigits(row.payload.cpf) || onlyDigits(client.whatsapp ?? "") === onlyDigits(row.payload.whatsapp) || client.email?.toLowerCase() === row.payload.email.toLowerCase()));
    setTarget(row.client_id ?? match?.id ?? "new");
  }
  function notify(row: IntakeRow, phone: string) {
    if (!row.payload) return;
    window.open(whatsappLink(phone, intakeNotificationMessage(row.payload, `${window.location.origin}/clientes`)), "_blank", "noopener");
    if (!row.notified_at) void notified({ data: { id: row.id } }).then(() => cache.invalidateQueries({ queryKey: ["client-intakes"] }));
  }
  const all = intakes.data ?? [];
  const preApproved = all.filter(row => row.status === "received");
  const rows = all.filter(row => filter === "all" || (filter === "open" ? row.status !== "reviewed" || !row.event_id : row.status === filter));
  const labels = { pending: "Aguardando cliente", received: "Pré-aprovado", reviewed: "Validado" };
  const e = selected?.payload?.event;
  const attractionName = (id?: string) => attractions.data?.find(item => item.id === id)?.name;
  return <section className="mb-8 border-y border-border py-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Fichas de contrato</h2>{preApproved.length > 0 && <p className="text-sm text-primary">{preApproved.length} {preApproved.length === 1 ? "cliente pré-aprovado aguardando validação" : "clientes pré-aprovados aguardando validação"}</p>}</div><div className="flex flex-wrap gap-2"><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-44" aria-label="Filtrar fichas"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Em andamento</SelectItem><SelectItem value="all">Todas</SelectItem>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{canCreate && <Button variant="outline" onClick={() => { setGenerating(true); setLink(""); setLinkClient("new"); setRecipientName(""); }}><Link2 className="size-4" />Gerar ficha</Button>}</div></div>
    {intakes.isPending ? <p role="status" className="mt-4 text-sm text-muted-foreground">Carregando fichas…</p> : intakes.isError ? <div className="mt-4"><p role="alert" className="text-sm text-destructive">{intakes.error.message}</p><Button variant="ghost" onClick={() => void intakes.refetch()}>Tentar novamente</Button></div> : rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhuma ficha neste filtro.</p> : <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-border">{rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 break-words text-sm font-medium">{row.payload?.full_name ?? row.recipient_name ?? clients.find(client => client.id === row.client_id)?.full_name ?? "Aguardando preenchimento"}<Badge variant={row.status === "received" ? "default" : "secondary"}>{labels[row.status]}</Badge>{row.status === "received" && !row.notified_at && <Badge variant="outline" className="border-accent text-foreground">Nova</Badge>}</p><p className="break-words text-xs text-muted-foreground">{row.payload ? `${row.payload.event_title} · ${formatEventDate(row.payload.event_date) || "sem data"}` : `Criada em ${formatEventDate(row.created_at.slice(0, 10))}`}{row.status === "pending" && new Date(row.expires_at).getTime() < Date.now() ? " · Link expirado" : ""}{row.event_id ? " · Evento cadastrado" : ""}</p></div><div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="sm" onClick={() => open(row)}>{row.status === "received" ? "Validar" : "Consultar"}</Button>{canDelete && <Button variant="ghost" size="icon" title="Excluir link" aria-label={`Excluir link de ${row.recipient_name ?? row.payload?.full_name ?? "ficha"}`} onClick={() => setDeleting(row)}><Trash2 className="size-4 text-destructive" /></Button>}</div></div>)}</div>}
    <Dialog open={generating} onOpenChange={setGenerating}><DialogContent><DialogHeader><DialogTitle>Ficha de contrato</DialogTitle><DialogDescription>Link pessoal, válido por 30 dias e um envio. O cliente preenche os dados pessoais e do evento.</DialogDescription></DialogHeader><div className="space-y-3"><Label>Cliente</Label><Select value={linkClient} onValueChange={value => { setLinkClient(value); setRecipientName(clients.find(client => client.id === value)?.full_name ?? ""); }} disabled={Boolean(link)}><SelectTrigger aria-label="Cliente do link"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Novo cliente / definir na validação</SelectItem>{clients.map(client => <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>)}</SelectContent></Select><div className="space-y-2"><Label htmlFor="intake-recipient">Nome do destinatário</Label><Input id="intake-recipient" placeholder="Ex.: João" maxLength={150} value={recipientName} disabled={Boolean(link)} onChange={event => setRecipientName(event.target.value)} /></div>{link ? <><Input aria-label="Link gerado" readOnly value={link} /><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Link copiado."); } catch { toast.error("Selecione e copie o link acima."); } }}><Copy className="size-4" />Copiar link</Button></> : <Button disabled={generate.isPending || !recipientName.trim()} onClick={() => generate.mutate()}><Link2 className="size-4" />{generate.isPending ? "Gerando…" : "Gerar link pessoal"}</Button>}</div></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={value => !deleted.isPending && !value && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir link da ficha?</AlertDialogTitle><AlertDialogDescription>O link de {deleting?.recipient_name ?? deleting?.payload?.full_name ?? "esta ficha"} deixará de funcionar e a ficha sairá desta lista. Clientes e eventos já cadastrados serão preservados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleted.isPending}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={deleted.isPending} onClick={() => deleted.mutate()}><Trash2 className="size-4" />{deleted.isPending ? "Excluindo…" : "Excluir link"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={Boolean(selected)} onOpenChange={value => !value && setSelected(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Ficha de contrato · {selected ? labels[selected.status] : ""}</DialogTitle><DialogDescription>Confira as informações antes de cadastrar o cliente.</DialogDescription></DialogHeader>
      {selected?.payload ? <div className="space-y-5">
        {selected.status === "received" && <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted p-3 text-sm"><MessageCircle className="size-4 text-primary" /><span className="mr-auto">Avisar a equipe no WhatsApp</span>{(recipients.data ?? []).length === 0 ? <span className="text-xs text-muted-foreground">Cadastre números em Configurações › Ficha de contrato.</span> : recipients.data?.map(r => <Button key={r.id} size="sm" variant="outline" onClick={() => notify(selected, r.phone)}>{r.name}</Button>)}</div>}
        <div className="flex items-center justify-between"><h3 className="font-semibold">Dados pessoais</h3>{selected.status === "received" && canEdit && !editing && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil className="size-4" />Corrigir dados</Button>}</div>
        {editing ? <ClientFields value={draft} onChange={next => setDraft(current => ({ ...current, ...next }))} errors={errors} prefix="review" publicForm /> :
        <dl className="grid gap-3 sm:grid-cols-2">{Object.entries({ "Nome completo": selected.payload.full_name, "Nascimento": formatEventDate(selected.payload.birth_date), "CPF": selected.payload.cpf, "RG": selected.payload.rg, "WhatsApp": selected.payload.whatsapp, "E-mail": selected.payload.email, "CEP": selected.payload.zip_code, "Endereço": [selected.payload.address, selected.payload.address_number, selected.payload.address_complement, selected.payload.neighborhood, selected.payload.city, selected.payload.state].filter(Boolean).join(", ") }).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm">{value || "—"}</dd></div>)}</dl>}
        <h3 className="border-t border-border pt-4 font-semibold">Dados do evento</h3>
        <dl className="grid gap-3 sm:grid-cols-2">{Object.entries({ "Título": selected.payload.event_title, "Tipo": selected.payload.event_type, "Data": formatEventDate(selected.payload.event_date), "Início da atração": e?.start_time, "Duração": e?.duration_minutes ? `${Math.floor(e.duration_minutes / 60)}h${String(e.duration_minutes % 60).padStart(2, "0")}` : "", "Atração": attractionName(e?.attraction_id), "Local": e?.venue, "Endereço do local": [e?.address, e?.venue_city, e?.venue_state].filter(Boolean).join(", "), "Cerimonialista": e ? yes(e.has_ceremonial) + (e.has_ceremonial ? ` · ${[e.ceremonial_name, e.ceremonial_contact].filter(Boolean).join(" · ")}${e.contact_via_ceremonial ? " · combinar direto" : ""}` : "") : "", "GuestBook": e ? yes(e.has_guestbook) : "", "Observações": selected.payload.notes }).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm">{value || "—"}</dd></div>)}</dl>
        {selected.status === "received" && canEdit && <div className="space-y-4 border-t border-border pt-4"><Label>Cadastrar como</Label><Select value={target} onValueChange={setTarget} disabled={Boolean(selected.client_id)}><SelectTrigger aria-label="Cliente para validação"><SelectValue /></SelectTrigger><SelectContent>{canCreate && <SelectItem value="new">Novo cliente</SelectItem>}{clients.map(client => <SelectItem key={client.id} value={client.id}>Vincular a {client.full_name}</SelectItem>)}</SelectContent></Select>{target !== "new" && <div className="flex items-start gap-3"><Checkbox id="fill-intake" checked={fill} onCheckedChange={value => setFill(value === true)} /><Label htmlFor="fill-intake" className="font-normal leading-relaxed">Preencher somente campos vazios do cliente. Dados existentes não serão sobrescritos.</Label></div>}<Button disabled={reviewed.isPending || (target === "new" && !canCreate)} onClick={() => reviewed.mutate()}><Check className="size-4" />{reviewed.isPending ? "Salvando…" : "Validar e cadastrar cliente"}</Button></div>}
        {selected.status === "reviewed" && selected.client_id && canCreateEvent && !selected.event_id && <Button asChild><Link to="/eventos" search={{ action: "new", intake: selected.id }}><Plus className="size-4" />Cadastrar evento</Link></Button>}
        {selected.event_id && <p className="text-sm text-muted-foreground">Evento já cadastrado a partir desta ficha.</p>}
      </div> : <p className="text-sm text-muted-foreground">Aguardando o cliente enviar as informações.</p>}
    </DialogContent></Dialog>
  </section>;
}
