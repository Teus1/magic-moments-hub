import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COLLABORATOR_PAYMENT_METHODS,
  collaboratorBalance,
  collaboratorServiceBalance,
  collaboratorTransportBalance,
  collaboratorPaymentTotals,
  type CollaboratorPaymentTotals,
} from "@/lib/collaborator-payments";
import { registerCollaboratorPayment } from "@/lib/collaborator-payments.functions";
import { buildPixPayload } from "@/lib/pix";
import { formatCurrency, formatEventDate, parseCurrencyInput } from "@/lib/events";

type Collaborator = { id: string; full_name: string; pix_key: string | null };
type Assignment = {
  id: string;
  collaborator_id: string;
  agreed_value: number;
  paid_value: number;
  service_paid_value: number;
  transport_paid_value: number;
  is_transport_responsible: boolean;
  transport_value: number | null;
  event: { id: string; name: string; event_date: string; status: string } | null;
};
type PixTarget = {
  linkId: string;
  eventName: string;
  eventDate: string;
  balance: number;
  personName: string;
  pixKey: string;
  category: "service" | "transport";
};

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PixKey({ value, name }: { value: string | null; name: string }) {
  return value ? (
    <div className="flex items-center gap-1">
      <span className="max-w-48 break-all text-sm">{value}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        title="Copiar chave Pix"
        aria-label={`Copiar chave Pix de ${name}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success("Chave Pix copiada.");
          } catch {
            toast.error("Não foi possível copiar a chave Pix.");
          }
        }}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  ) : (
    <span className="text-xs text-muted-foreground">Não cadastrada</span>
  );
}

function PixPaymentDialog({
  target,
  canEdit,
  onClose,
}: {
  target: PixTarget;
  canEdit: boolean;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const [amount, setAmount] = useState(target.balance.toFixed(2).replace(".", ","));
  const [paidAt, setPaidAt] = useState(todayIso());
  const [method, setMethod] = useState<string>("pix");
  const [category, setCategory] = useState<"service" | "transport">(target.category);
  const [saving, setSaving] = useState(false);
  const value = parseCurrencyInput(amount);
  const payload = useMemo(() => {
    try {
      return buildPixPayload({
        key: target.pixKey,
        amount: value,
        receiverName: target.personName,
        linkId: target.linkId,
      });
    } catch {
      return null;
    }
  }, [target.pixKey, target.personName, target.linkId, value]);

  async function copyCode() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar o código Pix.");
    }
  }

  async function register() {
    if (!(value > 0)) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await registerCollaboratorPayment({
        data: { linkId: target.linkId, amount: value, paidAt, method, category },
      });
      toast.success("Pagamento registrado.");
      void cache.invalidateQueries({ queryKey: ["collaborators", "event-payments"] });
      void cache.invalidateQueries({ queryKey: ["events", "teams"] });
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível registrar o pagamento.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Pagamento de {target.personName}</DialogTitle>
          <DialogDescription>
            {target.eventName} · {formatEventDate(target.eventDate)} · {target.category === "service" ? "Serviço" : "Deslocamento"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3">
          {payload ? (
            <QRCodeSVG value={payload} size={196} level="M" marginSize={2} />
          ) : (
            <p className="py-12 text-sm text-muted-foreground">
              Informe um valor maior que zero para gerar o QR.
            </p>
          )}
          <p className="text-xl font-semibold tabular-nums text-primary">{formatCurrency(value)}</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Chave Pix</p>
            <p className="truncate text-sm">{target.pixKey}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyCode} disabled={!payload}>
            <Copy className="mr-2 size-3.5" />
            Copiar código
          </Button>
        </div>

        {canEdit && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="pix-amount">Valor (R$)</Label>
                <Input
                  id="pix-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pix-date">Data</Label>
                <Input
                  id="pix-date"
                  type="date"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pix-method">Método</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="pix-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLLABORATOR_PAYMENT_METHODS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pix-category">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as "service" | "transport")}>
                <SelectTrigger id="pix-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Serviço</SelectItem>
                  <SelectItem value="transport">Deslocamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                O QR não confirma o Pix sozinho: registre aqui depois de conferir no banco.
              </p>
              <Button onClick={register} disabled={saving || !(value > 0)}>
                {saving ? "Registrando..." : "Registrar pagamento"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CollaboratorPayments({
  collaborators,
  canEdit,
}: {
  collaborators: Collaborator[];
  canEdit: boolean;
}) {
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(0);
  const [pixTarget, setPixTarget] = useState<PixTarget | null>(null);
  const assignments = useQuery({
    queryKey: ["collaborators", "event-payments"],
    queryFn: async () => {
      const rows: Assignment[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("event_collaborators")
          .select(
            "id, collaborator_id, agreed_value, paid_value, service_paid_value, transport_paid_value, is_transport_responsible, transport_value, event:events!event_collaborators_event_id_fkey(id, name, event_date, status)",
          )
          .order("id")
          .range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar os pagamentos da equipe.");
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < 500) break;
      }
      return rows;
    },
  });
  const people = useMemo(
    () => new Map(collaborators.map((person) => [person.id, person])),
    [collaborators],
  );
  const rows = useMemo(
    () =>
      (assignments.data ?? [])
        .filter((row) => row.event && people.has(row.collaborator_id))
        .sort(
          (a, b) =>
            (a.event?.event_date ?? "").localeCompare(b.event?.event_date ?? "") ||
            a.id.localeCompare(b.id),
        ),
    [assignments.data, people],
  );
  const totals = collaboratorPaymentTotals(rows);
  const getTotalPaid = (row: Assignment) => Number(row.service_paid_value ?? 0) + Number(row.transport_paid_value ?? 0);
  const pendingCount = rows.filter(
    (row) => collaboratorBalance(row.agreed_value, getTotalPaid(row)) > 0,
  ).length;
  const visible = rows.filter(
    (row) =>
      filter === "all" ||
      (filter === "pending"
        ? collaboratorBalance(row.agreed_value, getTotalPaid(row)) > 0
        : Number(row.agreed_value) > 0 &&
          collaboratorBalance(row.agreed_value, getTotalPaid(row)) === 0),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / 10));
  const currentPage = Math.min(page, pageCount - 1);

  return (
    <section className="mt-8 border-t border-border pt-6" aria-label="Pagamentos dos colaboradores">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Pagamentos da equipe</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingCount} {pendingCount === 1 ? "pagamento pendente" : "pagamentos pendentes"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            title="Atualizar pagamentos"
            aria-label="Atualizar pagamentos"
            disabled={assignments.isFetching}
            onClick={() => assignments.refetch()}
          >
            <RefreshCw className={assignments.isFetching ? "size-4 animate-spin" : "size-4"} />
          </Button>
          <Select
            value={filter}
            onValueChange={(value) => {
              setFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-44" aria-label="Situação dos pagamentos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Quitados</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" asChild>
            <Link to="/eventos" search={{}}>
              <ExternalLink className="mr-2 size-4" />
              Eventos
            </Link>
          </Button>
        </div>
      </div>
      {!assignments.isLoading && !assignments.isError && (
        <div className="mb-5 grid gap-3 border-y border-border py-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Serviço combinado</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(totals.serviceAgreed)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Serviço pago</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(totals.servicePaid)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5" />Serviço a pagar
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
              {formatCurrency(totals.servicePending)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Deslocamento combinado</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(totals.transportAgreed)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Deslocamento pago</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(totals.transportPaid)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5" />Deslocamento a pagar
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
              {formatCurrency(totals.transportPending)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Total combinado</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(totals.agreed)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Total pago</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(totals.paid)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5" />Total a pagar
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
              {formatCurrency(totals.pending)}
            </p>
          </div>
        </div>
      )}
      {assignments.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando pagamentos...</p>
      ) : assignments.isError ? (
        <p role="alert" className="py-6 text-sm text-destructive">
          Não foi possível carregar os pagamentos. Tente atualizar.
        </p>
      ) : (
        <>
          <Table mobileCards>
            <TableHeader>
              <TableRow>
                <TableHead>Evento / data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Chave Pix</TableHead>
                <TableHead className="text-right">Combinado Serviço</TableHead>
                <TableHead className="text-right">Pago Serviço</TableHead>
                <TableHead className="text-right">Combinado Deslocamento</TableHead>
                <TableHead className="text-right">Pago Deslocamento</TableHead>
                <TableHead className="text-right">A pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.slice(currentPage * 10, currentPage * 10 + 10).map((row) => {
                const person = people.get(row.collaborator_id);
                if (!person || !row.event) return null;
                const transportAgreed = row.is_transport_responsible ? Number(row.transport_value ?? 0) : 0;
                const serviceAgreed = Number(row.agreed_value) - transportAgreed;
                const servicePaid = Number(row.service_paid_value ?? 0);
                const transportPaid = Number(row.transport_paid_value ?? 0);
                const totalPaid = servicePaid + transportPaid;
                const serviceBalance = collaboratorServiceBalance(serviceAgreed, servicePaid);
                const transportBalance = collaboratorTransportBalance(transportAgreed, transportPaid);
                const totalBalance = collaboratorBalance(Number(row.agreed_value), totalPaid);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="max-w-64 whitespace-normal font-medium">{row.event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventDate(row.event.event_date)}
                      </p>
                      {row.event.status === "cancelled" && (
                        <Badge variant="outline" className="mt-1">
                          Cancelado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-48 whitespace-normal">
                      <div className="flex items-center gap-2">
                        {person.full_name}
                        {row.is_transport_responsible && (
                          <Badge variant="secondary" className="text-xs">
                            Transporte
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PixKey value={person.pix_key} name={person.full_name} />
                        {person.pix_key && (serviceBalance > 0 || transportBalance > 0) && (
                          <div className="flex gap-1">
                            {serviceBalance > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                title="Gerar QR Code Pix - Serviço"
                                aria-label={`Gerar QR Code Pix serviço para ${person.full_name}`}
                                onClick={() =>
                                  setPixTarget({
                                    linkId: row.id,
                                    eventName: row.event?.name ?? "",
                                    eventDate: row.event?.event_date ?? "",
                                    balance: serviceBalance,
                                    personName: person.full_name,
                                    pixKey: person.pix_key ?? "",
                                    category: "service",
                                  })
                                }
                              >
                                <QrCode className="size-3.5" />
                              </Button>
                            )}
                            {transportBalance > 0 && row.is_transport_responsible && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                title="Gerar QR Code Pix - Deslocamento"
                                aria-label={`Gerar QR Code Pix deslocamento para ${person.full_name}`}
                                onClick={() =>
                                  setPixTarget({
                                    linkId: row.id,
                                    eventName: row.event?.name ?? "",
                                    eventDate: row.event?.event_date ?? "",
                                    balance: transportBalance,
                                    personName: person.full_name,
                                    pixKey: person.pix_key ?? "",
                                    category: "transport",
                                  })
                                }
                              >
                                <QrCode className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(serviceAgreed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(servicePaid)}
                      {serviceBalance > 0 && (
                        <Badge
                          variant="outline"
                          className="ml-1 border-warning/30 bg-warning/10 text-foreground text-[10px]"
                        >
                          {servicePaid > 0 ? "Parcial" : "Pendente"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {transportAgreed > 0 ? (
                        <>
                          {formatCurrency(transportAgreed)}
                          <Badge variant="secondary" className="ml-1 text-xs">Combustível</Badge>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {transportPaid > 0 ? formatCurrency(transportPaid) : <span className="text-muted-foreground">—</span>}
                      {transportBalance > 0 && (
                        <Badge
                          variant="outline"
                          className="ml-1 border-warning/30 bg-warning/10 text-foreground text-[10px]"
                        >
                          {transportPaid > 0 ? "Parcial" : "Pendente"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold tabular-nums text-primary">
                        {formatCurrency(totalBalance)}
                      </p>
                      {totalBalance > 0 && (
                        <Badge
                          variant="outline"
                          className="mt-1 border-warning/30 bg-warning/10 text-foreground"
                        >
                          {totalPaid > 0 ? "Parcial" : "Pendente"}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    {filter === "pending"
                      ? "Nenhum pagamento pendente."
                      : "Nenhum pagamento encontrado."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {visible.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {visible.length} registros · Página {currentPage + 1} de {pageCount}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Pagamentos anteriores"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Próximos pagamentos"
                  disabled={currentPage + 1 >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {pixTarget && (
        <PixPaymentDialog target={pixTarget} canEdit={canEdit} onClose={() => setPixTarget(null)} />
      )}
    </section>
  );
}
