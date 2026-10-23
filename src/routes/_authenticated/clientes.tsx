import { useServerFn } from "@tanstack/react-start";
import { ClientFields } from "@/components/client-fields";
import { ClientIntakePanel } from "@/components/client-intake-panel";
import { saveClient } from "@/lib/client-intake.functions";
import { clientSchema } from "@/lib/client-intake";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { emptyClientForm, formatBirthDate, onlyDigits, type ClientForm } from "@/lib/clients";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Magic Moments" },
      { name: "description", content: "Cadastro e histórico de clientes da Magic Moments." },
      { property: "og:title", content: "Clientes — Magic Moments" },
      { property: "og:description", content: "Cadastro e histórico de clientes da Magic Moments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const save = useServerFn(saveClient);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clients = useQuery({
    queryKey: ["clients"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(SELECT_COLUMNS)
        .order("full_name");
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
      const phones = `${onlyDigits(client.whatsapp ?? "")}${onlyDigits(client.cpf ?? "")}`;
      return haystack.includes(term) || (digits.length > 0 && phones.includes(digits));
    });
  }, [clients.data, search]);

  function openCreate() {
    setFieldErrors({});
    setEditing(null);
    setForm(emptyClientForm);
    setDialogOpen(true);
  }

  function openEdit(client: ClientRow) {
    setFieldErrors({});
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
      const checked = clientSchema.safeParse(form);
      if (!checked.success) {
        setFieldErrors(
          Object.fromEntries(checked.error.issues.map((issue) => [issue.path[0], issue.message])),
        );
        throw new Error("Confira os campos indicados.");
      }
      setFieldErrors({});
      return save({ data: { id: editing?.id ?? null, draft: checked.data } });
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

  if (!canView) {
    return (
      <AppShell>
        <PageHeader
          title="Clientes"
          description="Você não tem permissão para visualizar este módulo."
        />
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

      <ClientIntakePanel
        clients={clients.data ?? []}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canCreateEvent={can("events", "create")}
      />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, WhatsApp, e-mail ou cidade"
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
          <Table mobileCards>
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
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!clients.isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <UsersRound className="mx-auto mb-3 size-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      {search
                        ? "Nenhum cliente encontrado para essa busca."
                        : "Nenhum cliente cadastrado ainda."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <p className="font-medium">{client.full_name}</p>
                    {(client.cpf || client.birth_date) && (
                      <p className="text-xs text-muted-foreground">
                        {[client.cpf, formatBirthDate(client.birth_date)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {client.notes && (
                      <p className="max-w-72 truncate text-xs text-muted-foreground">
                        {client.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
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
                    {client.email && (
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    )}
                    {!client.whatsapp && !client.email && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.city
                      ? `${client.city}${client.state ? ` - ${client.state}` : ""}`
                      : "—"}
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
            <DialogTitle className="font-display">
              {editing ? "Editar cliente" : "Novo cliente"}
            </DialogTitle>
            <DialogDescription>Dados de contato e endereço usados nos eventos.</DialogDescription>
          </DialogHeader>

          <ClientFields
            value={form}
            onChange={(next) => setForm((current) => ({ ...current, ...next }))}
            errors={fieldErrors}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? "Salvando..."
                : editing
                  ? "Salvar alterações"
                  : "Cadastrar cliente"}
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
