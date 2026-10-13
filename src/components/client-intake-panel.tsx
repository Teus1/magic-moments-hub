import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createIntakeLink, listIntakes, reviewIntake } from "@/lib/client-intake.functions";
import { type IntakeRow } from "@/lib/client-intake";
import { formatEventDate } from "@/lib/events";
import { onlyDigits } from "@/lib/clients";
type Client = { id: string; full_name: string; cpf: string | null; whatsapp: string | null; email: string | null };
export function ClientIntakePanel({ clients, canCreate, canEdit, canCreateEvent }: { clients: Client[]; canCreate: boolean; canEdit: boolean; canCreateEvent: boolean }) {
  const fetchList = useServerFn(listIntakes); const create = useServerFn(createIntakeLink); const review = useServerFn(reviewIntake);
  const cache = useQueryClient();
  const intakes = useQuery({ queryKey: ["client-intakes"], queryFn: () => fetchList() });
  const [generating, setGenerating] = useState(false); const [link, setLink] = useState(""); const [linkClient, setLinkClient] = useState("new");
  const [selected, setSelected] = useState<IntakeRow | null>(null); const [target, setTarget] = useState("new"); const [fill, setFill] = useState(false); const [filter, setFilter] = useState("all");
  const generate = useMutation({ mutationFn: async () => {
    const result = await create({ data: { client_id: linkClient === "new" ? null : linkClient, event_id: null } });
    return `${window.location.origin}/pre-cadastro?token=${result.token}`;
  }, onSuccess: url => { setLink(url); void cache.invalidateQueries({ queryKey: ["client-intakes"] }); }, onError: error => toast.error(error.message) });
  const reviewed = useMutation({ mutationFn: () => {
    if (!selected) throw new Error("Selecione o pré-cadastro.");
    return review({ data: { id: selected.id, client_id: target === "new" ? null : target, fill_missing: fill } });
  }, onSuccess: result => { setSelected(row => row ? { ...row, status: "reviewed", client_id: result.client_id } : null); void cache.invalidateQueries({ queryKey: ["client-intakes"] }); void cache.invalidateQueries({ queryKey: ["clients"] }); toast.success("Pré-cadastro revisado."); }, onError: error => toast.error(error.message) });
  function open(row: IntakeRow) {
    setSelected(row); setFill(false);
    const match = clients.find(client => row.payload && (onlyDigits(client.cpf ?? "") === onlyDigits(row.payload.cpf) || onlyDigits(client.whatsapp ?? "") === onlyDigits(row.payload.whatsapp) || client.email?.toLowerCase() === row.payload.email.toLowerCase()));
    setTarget(row.client_id ?? match?.id ?? "new");
  }
  const rows = (intakes.data ?? []).filter(row => filter === "all" || row.status === filter);
  const labels = { pending: "Pendente", received: "Recebido", reviewed: "Revisado" };
  return <section className="mb-8 border-y border-border py-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Pré-cadastros</h2><div className="flex flex-wrap gap-2"><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40" aria-label="Filtrar pré-cadastros"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{canCreate && <Button variant="outline" onClick={() => { setGenerating(true); setLink(""); setLinkClient("new"); }}><Link2 className="size-4" />Gerar link</Button>}</div></div>
    {intakes.isPending ? <p role="status" className="mt-4 text-sm text-muted-foreground">Carregando pré-cadastros…</p> : intakes.isError ? <div className="mt-4"><p role="alert" className="text-sm text-destructive">{intakes.error.message}</p><Button variant="ghost" onClick={() => void intakes.refetch()}>Tentar novamente</Button></div> : rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum pré-cadastro neste filtro.</p> : <div className="mt-4 max-h-80 overflow-y-auto divide-y divide-border">{rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{row.payload?.full_name ?? clients.find(client => client.id === row.client_id)?.full_name ?? "Aguardando preenchimento"}</p><p className="break-words text-xs text-muted-foreground">{row.payload?.event_title ?? `Criado em ${formatEventDate(row.created_at.slice(0, 10))}`} · {labels[row.status]}{row.status === "pending" && new Date(row.expires_at).getTime() < Date.now() ? " · Link expirado" : ""}</p></div><Button variant="ghost" size="sm" onClick={() => open(row)}>{row.status === "received" ? "Revisar" : "Consultar"}</Button></div>)}</div>}
    <Dialog open={generating} onOpenChange={setGenerating}><DialogContent><DialogHeader><DialogTitle>Link de pré-cadastro</DialogTitle><DialogDescription>Link pessoal, válido por 30 dias e um envio. Não exibe dados já cadastrados.</DialogDescription></DialogHeader><div className="space-y-3"><Label>Cliente</Label><Select value={linkClient} onValueChange={setLinkClient} disabled={Boolean(link)}><SelectTrigger aria-label="Cliente do link"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Novo cliente / definir na revisão</SelectItem>{clients.map(client => <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>)}</SelectContent></Select>{link ? <><Input aria-label="Link gerado" readOnly value={link} /><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Link copiado."); } catch { toast.error("Selecione e copie o link acima."); } }}><Copy className="size-4" />Copiar link</Button></> : <Button disabled={generate.isPending} onClick={() => generate.mutate()}><Link2 className="size-4" />{generate.isPending ? "Gerando…" : "Gerar link pessoal"}</Button>}</div></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Pré-cadastro · {selected ? labels[selected.status] : ""}</DialogTitle><DialogDescription>Confira o vínculo antes de utilizar os dados recebidos.</DialogDescription></DialogHeader>
      {selected?.payload ? <div className="space-y-5"><dl className="grid gap-3 sm:grid-cols-2">{Object.entries({ "Nome completo": selected.payload.full_name, "Nascimento": formatEventDate(selected.payload.birth_date), "CPF": selected.payload.cpf, "RG": selected.payload.rg, "WhatsApp": selected.payload.whatsapp, "E-mail": selected.payload.email, "CEP": selected.payload.zip_code, "Endereço": [selected.payload.address, selected.payload.address_number, selected.payload.address_complement, selected.payload.neighborhood, selected.payload.city, selected.payload.state].filter(Boolean).join(", "), "Título do evento": selected.payload.event_title, "Tipo": selected.payload.event_type, "Data do evento": formatEventDate(selected.payload.event_date), "Observações": selected.payload.notes }).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm">{value || "—"}</dd></div>)}</dl>
        {selected.status === "received" && canEdit && <div className="space-y-4 border-t border-border pt-4"><Label>Associar a cliente</Label><Select value={target} onValueChange={setTarget} disabled={Boolean(selected.client_id)}><SelectTrigger aria-label="Cliente para revisão"><SelectValue /></SelectTrigger><SelectContent>{canCreate && <SelectItem value="new">Criar cliente após revisão</SelectItem>}{clients.map(client => <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>)}</SelectContent></Select>{target !== "new" && <div className="flex items-start gap-3"><Checkbox id="fill-intake" checked={fill} onCheckedChange={value => setFill(value === true)} /><Label htmlFor="fill-intake" className="font-normal leading-relaxed">Preencher somente campos vazios do cliente. Dados existentes e observações não serão sobrescritos.</Label></div>}<Button disabled={reviewed.isPending || (target === "new" && !canCreate)} onClick={() => reviewed.mutate()}><Check className="size-4" />{reviewed.isPending ? "Salvando…" : "Confirmar revisão"}</Button></div>}
        {selected.status === "reviewed" && selected.client_id && canCreateEvent && !selected.event_id && <Button asChild><Link to="/eventos" search={{ action: "new", intake: selected.id }}><Plus className="size-4" />Criar evento com estes dados</Link></Button>}
        {selected.event_id && <p className="text-sm text-muted-foreground">Pré-cadastro já vinculado a um evento.</p>}
      </div> : <p className="text-sm text-muted-foreground">Aguardando o cliente enviar as informações.</p>}
    </DialogContent></Dialog>
  </section>;
}