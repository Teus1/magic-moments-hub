import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createSystemUser, deleteSystemUser, setUserPassword } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/configuracoes/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Magic Moments" },
      { name: "description", content: "Gestão da equipe interna e acessos ao painel." },
      { property: "og:title", content: "Usuários — Magic Moments" },
      { property: "og:description", content: "Gestão da equipe interna e acessos ao painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { can, user: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const createUser = useServerFn(createSystemUser);
  const resetPassword = useServerFn(setUserPassword);
  const deleteUser = useServerFn(deleteSystemUser);

  const [openCreate, setOpenCreate] = useState(false);
  const [passwordFor, setPasswordFor] = useState<{ id: string; name: string } | null>(null);
  const [deleteFor, setDeleteFor] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    roleId: "",
    status: "active" as "active" | "inactive",
  });

  const roles = useQuery({
    queryKey: ["roles-basic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const users = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, username, email, status, last_login_at, role_id, roles(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createUser({
        data: {
          name: form.name,
          username: form.username,
          email: form.email || null,
          password: form.password,
          roleId: form.roleId,
          status: form.status,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário criado.");
      setOpenCreate(false);
      setForm({ name: "", username: "", email: "", password: "", roleId: "", status: "active" });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; roleId?: string; status?: "active" | "inactive" }) => {
      const patch: { role_id?: string; status?: "active" | "inactive" } = {};
      if (input.roleId) patch.role_id = input.roleId;
      if (input.status) patch.status = input.status;
      const { error } = await supabase.from("profiles").update(patch).eq("id", input.id);
      if (error) throw new Error("Não foi possível atualizar o usuário.");
    },
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const passwordMutation = useMutation({
    mutationFn: () => {
      if (!passwordFor) throw new Error("Selecione um usuário.");
      return resetPassword({ data: { userId: passwordFor.id, password: newPassword } });
    },
    onSuccess: () => {
      toast.success("Senha redefinida.");
      setPasswordFor(null);
      setNewPassword("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!deleteFor) throw new Error("Selecione um usuário.");
      return deleteUser({ data: { userId: deleteFor.id } });
    },
    onSuccess: () => {
      toast.success("Usuário excluído definitivamente.");
      setDeleteFor(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["available-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canEdit = can("users", "edit");
  const canDelete = can("users", "delete");

  return (
    <AppShell>
      <PageHeader
        title="Usuários"
        description="Cadastre a equipe, defina roles e controle o acesso ao painel."
        action={
          can("users", "create") ? (
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 size-4" /> Novo usuário
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table mobileCards>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {users.data?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium">{user.name}</p>
                    {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.username}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={user.role_id ?? ""}
                        onValueChange={(value) => updateMutation.mutate({ id: user.id, roleId: value })}
                      >
                        <SelectTrigger className="w-full sm:w-44">
                          <SelectValue placeholder="Sem role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.data?.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      (user.roles?.name ?? "—")
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "outline"}>
                      {user.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateMutation.mutate({
                              id: user.id,
                              status: user.status === "active" ? "inactive" : "active",
                            })
                          }
                        >
                          {user.status === "active" ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPasswordFor({ id: user.id, name: user.name })}
                        >
                          <KeyRound className="mr-1 size-4" /> Senha
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Excluir ${user.name}`}
                            title={user.id === currentUser?.id ? "Você não pode excluir sua própria conta" : "Excluir usuário"}
                            disabled={user.id === currentUser?.id}
                            onClick={() => setDeleteFor({ id: user.id, name: user.name })}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Novo usuário</DialogTitle>
            <DialogDescription>O acesso é feito por login e senha internos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u-name">Nome</Label>
              <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u-username">Login</Label>
                <Input
                  id="u-username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-password">Senha</Label>
                <Input
                  id="u-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">E-mail (opcional)</Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.roleId} onValueChange={(value) => setForm({ ...form, roleId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.data?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordFor !== null} onOpenChange={(open) => !open && setPasswordFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Redefinir senha</DialogTitle>
            <DialogDescription>{passwordFor?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordFor(null)}>
              Cancelar
            </Button>
            <Button onClick={() => passwordMutation.mutate()} disabled={passwordMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteFor !== null} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir usuário definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta de <strong className="text-foreground">{deleteFor?.name}</strong> perderá o acesso imediatamente.
              Os registros operacionais e o histórico serão preservados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 />
              {deleteMutation.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
