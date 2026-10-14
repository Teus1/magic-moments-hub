import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { HardHat, MessageCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPhone, onlyDigits } from "@/lib/clients";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createCollaboratorWithAccount, createCollaboratorWithExistingAccount } from "@/lib/admin.functions";
import { isAccountAvailable, validateExistingAccountId } from "@/lib/collaborator-accounts";

export const Route = createFileRoute("/_authenticated/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores — Magic Moments" },
      { property: "og:title", content: "Colaboradores — Magic Moments" },
      { property: "og:description", content: "Operadores dos eventos da Magic Moments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content: "Cadastro dos operadores que trabalham nos eventos da Magic Moments.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CollaboratorsPage,
});

interface CollaboratorRow {
  id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  role_title: string | null;
  notes: string | null;
  status: "active" | "inactive";
  profile_id: string | null;
}

interface CollaboratorForm {
  full_name: string;
  nickname: string;
  phone: string;
  whatsapp: string;
  email: string;
  role_title: string;
  notes: string;
  status: "active" | "inactive";
  profile_id: string;
  account_username: string;
  account_password: string;
  account_mode: "new" | "existing";
}

const NO_PROFILE = "__none__";

const emptyForm: CollaboratorForm = {
  full_name: "",
  nickname: "",
  phone: "",
  whatsapp: "",
  email: "",
  role_title: "",
  notes: "",
  status: "active",
  profile_id: "",
  account_username: "",
  account_password: "",
  account_mode: "new",
};

const SELECT_COLUMNS =
  "id, full_name, nickname, phone, whatsapp, email, role_title, notes, status, profile_id";

function CollaboratorsPage() {
  const { can } = useCurrentUser();
  const queryClient = useQueryClient();
  const createCollaborator = useServerFn(createCollaboratorWithAccount);
  const linkCollaborator = useServerFn(createCollaboratorWithExistingAccount);

  const canView = can("collaborators", "view");
  const canCreate = can("collaborators", "create");
  const canEdit = can("collaborators", "edit");
  const canDelete = can("collaborators", "delete");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CollaboratorRow | null>(null);
  const [form, setForm] = useState<CollaboratorForm>(emptyForm);
  const [deleting, setDeleting] = useState<CollaboratorRow | null>(null);

  const collaborators = useQuery({
    queryKey: ["collaborators"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborators")
        .select(SELECT_COLUMNS)
        .order("full_name");
      if (error) throw new Error("Não foi possível carregar os colaboradores.");
      return (data ?? []) as CollaboratorRow[];
    },
  });

  const canLinkProfile = can("users", "view");

  const profiles = useQuery({
    queryKey: ["collaborators", "profiles-options"],
    enabled: canView && canLinkProfile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, username, status")
        .order("name");
      if (error) throw new Error("Não foi possível carregar as contas de acesso.");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = onlyDigits(search);
    return (collaborators.data ?? []).filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = [row.full_name, row.nickname, row.email, row.role_title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (haystack.includes(term)) return true;
      if (digits.length >= 3) {
        return [row.phone, row.whatsapp].some((value) => onlyDigits(value ?? "").includes(digits));
      }
      return false;
    });
  }, [collaborators.data, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(row: CollaboratorRow) {
    setEditing(row);
    setForm({
      full_name: row.full_name,
      nickname: row.nickname ?? "",
      phone: row.phone ?? "",
      whatsapp: row.whatsapp ?? "",
      email: row.email ?? "",
      role_title: row.role_title ?? "",
      notes: row.notes ?? "",
      status: row.status,
      profile_id: row.profile_id ?? "",
      account_username: "",
      account_password: "",
      account_mode: "existing",
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fullName = form.full_name.trim();
      if (fullName.length < 2) throw new Error("Informe o nome do colaborador.");
      if (!editing && form.account_mode === "new" && form.account_username.trim().length < 3) {
        throw new Error("Informe um login com pelo menos 3 caracteres.");
      }
      if (!editing && form.account_mode === "new" && form.account_password.length < 8) {
        throw new Error("A senha inicial deve ter pelo menos 8 caracteres.");
      }

      const payload = {
        full_name: fullName,
        nickname: form.nickname.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        role_title: form.role_title.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
        profile_id: form.profile_id || null,
      };

      if (editing) {
        const { error } = await supabase.from("collaborators").update(payload).eq("id", editing.id);
        if (error?.code === "23505") throw new Error("Esta conta já está vinculada a outro colaborador.");
        if (error) throw new Error(error.message || "Não foi possível salvar o colaborador.");
        return;
      }

      if (form.account_mode === "existing") {
        await linkCollaborator({ data: {
          fullName,
          profileId: validateExistingAccountId(form.profile_id),
          nickname: payload.nickname,
          phone: payload.phone,
          whatsapp: payload.whatsapp,
          email: payload.email,
          roleTitle: payload.role_title,
          notes: payload.notes,
          status: payload.status,
        } });
        return;
      }

      await createCollaborator({
        data: {
          fullName,
          nickname: payload.nickname,
          phone: payload.phone,
          whatsapp: payload.whatsapp,
          email: payload.email,
          roleTitle: payload.role_title,
          notes: payload.notes,
          status: payload.status,
          username: form.account_username,
          password: form.account_password,
        },
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Colaborador atualizado." : "Colaborador cadastrado.");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collaborators").delete().eq("id", id);
      if (error)
        throw new Error("Não foi possível excluir. Verifique se há eventos vinculados a este colaborador.");
    },
    onSuccess: () => {
      toast.success("Colaborador excluído.");
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!canView) {
    return (
      <AppShell>
        <PageHeader
          title="Colaboradores"
          description="Você não tem permissão para visualizar este módulo."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Colaboradores"
        description="Operadores que trabalham nos eventos. Vincule-os ao evento na aba Eventos."
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" /> Novo colaborador
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
              placeholder="Buscar por nome, função, e-mail ou telefone"
              className="pl-9"
              aria-label="Buscar colaboradores"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "colaborador" : "colaboradores"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!collaborators.isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <HardHat className="mx-auto mb-3 size-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "Nenhum colaborador encontrado com esses filtros."
                        : "Nenhum colaborador cadastrado ainda."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.full_name}</p>
                    {row.nickname && <p className="text-xs text-muted-foreground">{row.nickname}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{row.role_title || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <p>{row.phone ? formatPhone(row.phone) : "—"}</p>
                    {row.email && <p className="text-xs text-muted-foreground">{row.email}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        row.status === "active"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-muted-foreground/30 bg-muted text-muted-foreground",
                      )}
                    >
                      {row.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {(row.whatsapp || row.phone) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`WhatsApp de ${row.full_name}`}
                          onClick={() =>
                            window.open(
                              `https://wa.me/55${onlyDigits(row.whatsapp || row.phone || "")}`,
                              "_blank",
                              "noopener",
                            )
                          }
                        >
                          <MessageCircle className="size-4 text-success" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                          <Pencil className="mr-1 size-4" /> Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${row.full_name}`}
                          onClick={() => setDeleting(row)}
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
        <DialogContent className="max-h-[92vh] overflow-y-auto border-primary/10 bg-background/95 p-0 shadow-elevated backdrop-blur-xl sm:max-w-2xl sm:rounded-xl">
          <DialogHeader className="border-b border-border/70 bg-card/70 px-6 pb-5 pt-6">
            <DialogTitle className="font-display">
              {editing ? "Editar colaborador" : "Novo colaborador"}
            </DialogTitle>
            <DialogDescription>
              Colaboradores ativos ficam disponíveis para escalar nos eventos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5 [&_label]:font-medium">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-name">
                  Nome completo<span className="ml-1 text-destructive">*</span>
                </Label>
                <Input
                  id="c-name"
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  placeholder="Ex.: João da Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-nickname">Apelido</Label>
                <Input
                  id="c-nickname"
                  value={form.nickname}
                  onChange={(event) => setForm({ ...form, nickname: event.target.value })}
                  placeholder="Como é chamado na equipe"
                />
              </div>
            </div>

            {!editing && (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground">Acesso à Minha agenda</p>
                </div>
                <div className="mb-4 space-y-2">
                  <Label htmlFor="c-account-mode">Conta de acesso</Label>
                  <Select value={form.account_mode} onValueChange={(value) => setForm({ ...form, account_mode: value as "new" | "existing", profile_id: "", account_password: "" })}>
                    <SelectTrigger id="c-account-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" disabled={!can("users", "create")}>Criar nova conta</SelectItem>
                      <SelectItem value="existing" disabled={!canLinkProfile}>Vincular conta existente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.account_mode === "existing" ? (
                  <div className="space-y-2">
                    <Label htmlFor="c-existing-account">Conta existente<span className="ml-1 text-destructive">*</span></Label>
                    <Select value={form.profile_id} onValueChange={(value) => setForm({ ...form, profile_id: value })}>
                      <SelectTrigger id="c-existing-account" disabled={profiles.isLoading || profiles.isError}>
                        <SelectValue placeholder={profiles.isLoading ? "Carregando contas..." : "Selecione a conta"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(profiles.data ?? []).filter((profile) => isAccountAvailable(profile.id, collaborators.data ?? [])).map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>{profile.name} · {profile.username}{profile.status === "inactive" ? " (Inativa)" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {profiles.isError && <p className="text-xs text-destructive">Não foi possível carregar as contas.</p>}
                    {!profiles.isLoading && !profiles.isError && !(profiles.data ?? []).some((profile) => isAccountAvailable(profile.id, collaborators.data ?? [])) && <p className="text-xs text-muted-foreground">Nenhuma conta disponível para vínculo.</p>}
                    <p className="text-xs text-muted-foreground">Login, senha e permissões da conta serão mantidos.</p>
                  </div>
                ) : <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="c-username">
                      Login<span className="ml-1 text-destructive">*</span>
                    </Label>
                    <Input
                      id="c-username"
                      value={form.account_username}
                      onChange={(event) => setForm({ ...form, account_username: event.target.value })}
                      placeholder="Ex.: joao.silva"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-password">
                      Senha inicial<span className="ml-1 text-destructive">*</span>
                    </Label>
                    <Input
                      id="c-password"
                      type="password"
                      value={form.account_password}
                      onChange={(event) => setForm({ ...form, account_password: event.target.value })}
                      placeholder="Mínimo de 8 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                </div>}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-phone">Telefone</Label>
                <Input
                  id="c-phone"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: formatPhone(event.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-whatsapp">WhatsApp</Label>
                <Input
                  id="c-whatsapp"
                  value={form.whatsapp}
                  onChange={(event) => setForm({ ...form, whatsapp: formatPhone(event.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-email">E-mail</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="nome@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-role">Função</Label>
                <Input
                  id="c-role"
                  value={form.role_title}
                  onChange={(event) => setForm({ ...form, role_title: event.target.value })}
                  placeholder="Ex.: Operador de cabine"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value as "active" | "inactive" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inativos não aparecem na escala de novos eventos.
                </p>
              </div>
              {editing && canLinkProfile && (
                <div className="space-y-2">
                  <Label>Conta de acesso</Label>
                  <Select
                    value={form.profile_id || NO_PROFILE}
                    onValueChange={(value) =>
                      setForm({ ...form, profile_id: value === NO_PROFILE ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem conta vinculada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PROFILE}>Sem conta vinculada</SelectItem>
                      {(profiles.data ?? []).filter((profile) => isAccountAvailable(profile.id, collaborators.data ?? [], editing.id)).map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} · {profile.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ao vincular, o colaborador vê seus eventos e valores em “Minha agenda”.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-notes">Observações</Label>
              <Textarea
                id="c-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Disponibilidade, equipamentos, combinados, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xl">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleting?.full_name}</strong>? Essa ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
