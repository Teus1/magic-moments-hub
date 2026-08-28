import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MessageCircle, Pencil, Plus, Search, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  emptyClientForm,
  formatBirthDate,
  formatCpf,
  formatPhone,
  formatZip,
  lookupZipCode,
  onlyDigits,
  type ClientForm,
} from "@/lib/clients";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Magic Moments" },
      { name: "description", content: "Cadastro e histórico de clientes da Magic Moments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

interface ClientRow {
  id: string;
  full_name: string;
  birth_date: string | null;
  cpf: string | null;
  rg: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  zip_code: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
}

const SELECT_COLUMNS =
  "id, full_name, birth_date, cpf, rg, phone, whatsapp, email, zip_code, address, address_number, address_complement, neighborhood, city, state, notes, created_at";

function ClientsPage() {
  const { can } = useCurrentUser();
  const queryClient = useQueryClient();

  const canCreate = can("clients", "create");
  const canEdit = can("clients", "edit");
  const canDelete = can("clients", "delete");
  const canView = can("clients", "view");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyClientForm);
  const [deleting, setDeleting] = useState<ClientRow | null>(null);
  const [zipLoading, setZipLoading] = useState(false);

  const clients = useQuery({
    queryKey: ["clients"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select(SELECT_COLUMNS).order("full_name");
      if (error) throw new Error("Não foi possível carregar os clientes.");
      return data as ClientRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients.data ?? [];
    const digits = onlyDigits(term);
    return (clients.data ?? []).filter((client) => {
      const haystack = [client.full_name, client.email, client.city, client.neighborhood]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const phones = `${onlyDigits(client.phone ?? "")}${onlyDigits(client.whatsapp ?? "")}`;
      return haystack.includes(term) || (digits.length > 0 && phones.includes(digits));
    });
  }, [clients.data, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyClientForm);
    setDialogOpen(true);
  }

  function openEdit(client: ClientRow) {
    setEditing(client);
    setForm({
      full_name: client.full_name,
      birth_date: client.birth_date ?? "",
      cpf: client.cpf ?? "",
      rg: client.rg ?? "",
      phone: client.phone ?? "",
      whatsapp: client.whatsapp ?? "",
      email: client.email ?? "",
      zip_code: client.zip_code ?? "",
      address: client.address ?? "",
      address_number: client.address_number ?? "",
      address_complement: client.address_complement ?? "",
      neighborhood: client.neighborhood ?? "",
      city: client.city ?? "",
      state: client.state ?? "",
      notes: client.notes ?? "",
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = form.full_name.trim();
      if (name.length < 2) throw new Error("Informe o nome do cliente.");

      const payload = {
        full_name: name,
        birth_date: form.birth_date || null,
        cpf: form.cpf.trim() || null,
        rg: form.rg.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        zip_code: form.zip_code.trim() || null,
        address: form.address.trim() || null,
        address_number: form.address_number.trim() || null,
        address_complement: form.address_complement.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase() || null,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
        if (error) throw new Error("Não foi possível salvar o cliente.");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("clients")
        .insert({ ...payload, created_by: userData.user?.id ?? null });
      if (error) throw new Error("Não foi possível cadastrar o cliente.");
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado." : "Cliente cadastrado.");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyClientForm);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw new Error("Não foi possível excluir. Verifique se há eventos vinculados.");
    },
    onSuccess: () => {
      toast.success("Cliente excluído.");
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleZipBlur() {
    const digits = onlyDigits(form.zip_code);
    if (digits.length !== 8) return;
    setZipLoading(true);
    const result = await lookupZipCode(digits);
    setZipLoading(false);
    if (!result) {
      toast.error("CEP não encontrado.");
      return;
    }
    setForm((current) => ({
      ...current,
      address: result.address || current.address,
      neighborhood: result.neighborhood || current.neighborhood,
      city: result.city || current.city,
      state: result.state || current.state,
    }));
  }

  if (!canView) {
    return (
      <AppShell>
        <PageHeader title="Clientes" description="Você não tem permissão para visualizar este módulo." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Clientes"
        description="Centralize os contatos e endereços dos clientes da Magic Moments."
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" /> Novo cliente
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, telefone, e-mail ou cidade"
              className="pl-9"
              aria-label="Buscar clientes"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!clients.isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <UsersRound className="mx-auto mb-3 size-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente cadastrado ainda."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <p className="font-medium">{client.full_name}</p>
                    {client.notes && (
                      <p className="max-w-72 truncate text-xs text-muted-foreground">{client.notes}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {client.phone && <p>{client.phone}</p>}
                    {client.whatsapp && (
                      <a
                        href={`https://wa.me/55${onlyDigits(client.whatsapp)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <MessageCircle className="size-3" /> {client.whatsapp}
                      </a>
                    )}
                    {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                    {!client.phone && !client.whatsapp && !client.email && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.city ? `${client.city}${client.state ? ` - ${client.state}` : ""}` : "—"}
                    {client.neighborhood && <p className="text-xs">{client.neighborhood}</p>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(client)}>
                          <Pencil className="mr-1 size-4" /> Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${client.full_name}`}
                          onClick={() => setDeleting(client)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>Dados de contato e endereço usados nos eventos.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Nome completo</Label>
              <Input
                id="c-name"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="c-phone">Telefone</Label>
                <Input
                  id="c-phone"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: formatPhone(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-whatsapp">WhatsApp</Label>
                <Input
                  id="c-whatsapp"
                  value={form.whatsapp}
                  onChange={(event) => setForm({ ...form, whatsapp: formatPhone(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-email">E-mail</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="c-zip">CEP</Label>
                <Input
                  id="c-zip"
                  value={form.zip_code}
                  onChange={(event) => setForm({ ...form, zip_code: formatZip(event.target.value) })}
                  onBlur={handleZipBlur}
                  placeholder={zipLoading ? "Buscando..." : "00000-000"}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-address">Endereço</Label>
                <Input
                  id="c-address"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="c-number">Número</Label>
                <Input
                  id="c-number"
                  value={form.address_number}
                  onChange={(event) => setForm({ ...form, address_number: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-complement">Complemento</Label>
                <Input
                  id="c-complement"
                  value={form.address_complement}
                  onChange={(event) => setForm({ ...form, address_complement: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-neighborhood">Bairro</Label>
                <Input
                  id="c-neighborhood"
                  value={form.neighborhood}
                  onChange={(event) => setForm({ ...form, neighborhood: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-city">Cidade</Label>
                <Input
                  id="c-city"
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-state">UF</Label>
                <Input
                  id="c-state"
                  maxLength={2}
                  value={form.state}
                  onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-notes">Observações</Label>
              <Textarea
                id="c-notes"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.full_name} será removido definitivamente do cadastro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
