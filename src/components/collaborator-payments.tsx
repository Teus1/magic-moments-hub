import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ChevronLeft, ChevronRight, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collaboratorBalance, collaboratorPaymentTotals } from "@/lib/collaborator-payments";
import { formatCurrency, formatEventDate } from "@/lib/events";

type Collaborator = { id: string; full_name: string; pix_key: string | null };
type Assignment = {
  id: string; collaborator_id: string; agreed_value: number; paid_value: number;
  event: { id: string; name: string; event_date: string; status: string } | null;
};

export function PixKey({ value, name }: { value: string | null; name: string }) {
  return value ? <div className="flex items-center gap-1">
    <span className="max-w-48 break-all text-sm">{value}</span>
    <Button variant="ghost" size="icon" className="size-8 shrink-0" title="Copiar chave Pix" aria-label={`Copiar chave Pix de ${name}`} onClick={async () => {
      try { await navigator.clipboard.writeText(value); toast.success("Chave Pix copiada."); }
      catch { toast.error("Não foi possível copiar a chave Pix."); }
    }}><Copy className="size-3.5" /></Button>
  </div> : <span className="text-xs text-muted-foreground">Não cadastrada</span>;
}

export function CollaboratorPayments({ collaborators }: { collaborators: Collaborator[] }) {
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(0);
  const assignments = useQuery({
    queryKey: ["collaborators", "event-payments"],
    queryFn: async () => {
      const rows: Assignment[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("event_collaborators")
          .select("id, collaborator_id, agreed_value, paid_value, event:events!event_collaborators_event_id_fkey(id, name, event_date, status)")
          .order("id").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar os pagamentos da equipe.");
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < 500) break;
      }
      return rows;
    },
  });
  const people = useMemo(() => new Map(collaborators.map(person => [person.id, person])), [collaborators]);
  const rows = useMemo(() => (assignments.data ?? []).filter(row => row.event && people.has(row.collaborator_id))
    .sort((a, b) => (a.event?.event_date ?? "").localeCompare(b.event?.event_date ?? "") || a.id.localeCompare(b.id)), [assignments.data, people]);
  const totals = collaboratorPaymentTotals(rows);
  const pendingCount = rows.filter(row => collaboratorBalance(row.agreed_value, row.paid_value) > 0).length;
  const visible = rows.filter(row => filter === "all" || (filter === "pending" ? collaboratorBalance(row.agreed_value, row.paid_value) > 0 : Number(row.agreed_value) > 0 && collaboratorBalance(row.agreed_value, row.paid_value) === 0));
  const pageCount = Math.max(1, Math.ceil(visible.length / 10));
  const currentPage = Math.min(page, pageCount - 1);

  return <section className="mt-8 border-t border-border pt-6" aria-label="Pagamentos dos colaboradores">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-display text-xl">Pagamentos da equipe</h2>
        <p className="mt-1 text-sm text-muted-foreground">{pendingCount} {pendingCount === 1 ? "pagamento pendente" : "pagamentos pendentes"}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" title="Atualizar pagamentos" aria-label="Atualizar pagamentos" disabled={assignments.isFetching} onClick={() => assignments.refetch()}><RefreshCw className={assignments.isFetching ? "size-4 animate-spin" : "size-4"} /></Button>
        <Select value={filter} onValueChange={value => { setFilter(value); setPage(0); }}>
          <SelectTrigger className="w-44" aria-label="Situação dos pagamentos"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="paid">Quitados</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" asChild><Link to="/eventos" search={{}}><ExternalLink className="mr-2 size-4" />Eventos</Link></Button>
      </div>
    </div>
    {!assignments.isLoading && !assignments.isError && <div className="mb-5 grid gap-4 border-y border-border py-4 sm:grid-cols-3">
      <div><p className="text-xs text-muted-foreground">Total combinado</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(totals.agreed)}</p></div>
      <div><p className="text-xs text-muted-foreground">Total pago</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(totals.paid)}</p></div>
      <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><AlertCircle className="size-3.5" />A pagar</p><p className="mt-1 text-xl font-semibold tabular-nums text-primary">{formatCurrency(totals.pending)}</p></div>
    </div>}
    {assignments.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando pagamentos...</p> : assignments.isError ? <p role="alert" className="py-6 text-sm text-destructive">Não foi possível carregar os pagamentos. Tente atualizar.</p> : <>
      <Table><TableHeader><TableRow><TableHead>Evento / data</TableHead><TableHead>Colaborador</TableHead><TableHead>Chave Pix</TableHead><TableHead className="text-right">Combinado</TableHead><TableHead className="text-right">Pago</TableHead><TableHead className="text-right">A pagar</TableHead></TableRow></TableHeader>
        <TableBody>{visible.slice(currentPage * 10, currentPage * 10 + 10).map(row => {
          const person = people.get(row.collaborator_id);
          if (!person || !row.event) return null;
          const balance = collaboratorBalance(row.agreed_value, row.paid_value);
          return <TableRow key={row.id}>
            <TableCell><p className="max-w-64 whitespace-normal font-medium">{row.event.name}</p><p className="text-xs text-muted-foreground">{formatEventDate(row.event.event_date)}</p>{row.event.status === "cancelled" && <Badge variant="outline" className="mt-1">Cancelado</Badge>}</TableCell>
            <TableCell className="max-w-48 whitespace-normal">{person.full_name}</TableCell>
            <TableCell><PixKey value={person.pix_key} name={person.full_name} /></TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(Number(row.agreed_value))}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(Number(row.paid_value))}</TableCell>
            <TableCell className="text-right"><p className="font-semibold tabular-nums text-primary">{formatCurrency(balance)}</p>{balance > 0 && <Badge variant="outline" className="mt-1 border-warning/30 bg-warning/10 text-foreground">{Number(row.paid_value) > 0 ? "Parcial" : "Pendente"}</Badge>}</TableCell>
          </TableRow>;
        })}{visible.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{filter === "pending" ? "Nenhum pagamento pendente." : "Nenhum pagamento encontrado."}</TableCell></TableRow>}</TableBody>
      </Table>
      {visible.length > 0 && <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{visible.length} registros · Página {currentPage + 1} de {pageCount}</span><div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Pagamentos anteriores" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" /></Button><Button variant="outline" size="icon" aria-label="Próximos pagamentos" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="size-4" /></Button></div></div>}
    </>}
  </section>;
}