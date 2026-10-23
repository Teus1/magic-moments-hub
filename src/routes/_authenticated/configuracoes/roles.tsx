import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MODULE_LABELS, normalizeUsername } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/configuracoes/roles")({
  head: () => ({
    meta: [
      { title: "Roles e permissões — Magic Moments" },
      { name: "description", content: "Configure papéis de acesso e permissões por módulo." },
      { property: "og:title", content: "Roles e permissões — Magic Moments" },
      { property: "og:description", content: "Papéis de acesso e permissões da Magic Moments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const { can, refresh } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, slug, description, is_system")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("id, module, action, label, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const activeRoleId = selectedRole ?? roles.data?.[0]?.id ?? null;

  const rolePermissions = useQuery({
    queryKey: ["role-permissions", activeRoleId],
    enabled: Boolean(activeRoleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", activeRoleId!);
      if (error) throw error;
      return data.map((row) => row.permission_id);
    },
  });

  const createRole = useMutation({
    mutationFn: async () => {
      const name = newRole.name.trim();
      if (!name) throw new Error("Informe o nome da role.");
      const { error } = await supabase.from("roles").insert({
        name,
        slug: normalizeUsername(name).replace(/[._]/g, "-") || name.toLowerCase(),
        description: newRole.description.trim() || null,
      });
      if (error) throw new Error("Não foi possível criar a role.");
    },
    onSuccess: () => {
      toast.success("Role criada.");
      setOpenCreate(false);
      setNewRole({ name: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const togglePermission = useMutation({
    mutationFn: async (input: { permissionId: string; enabled: boolean }) => {
      if (input.enabled) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role_id: activeRoleId!, permission_id: input.permissionId });
        if (error) throw new Error("Não foi possível conceder a permissão.");
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", activeRoleId!)
          .eq("permission_id", input.permissionId);
        if (error) throw new Error("Não foi possível remover a permissão.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions", activeRoleId] });
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error)
        throw new Error("Não foi possível excluir a role (verifique usuários vinculados).");
    },
    onSuccess: () => {
      toast.success("Role excluída.");
      setSelectedRole(null);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canManage = can("roles", "manage");
  const granted = new Set(rolePermissions.data ?? []);
  const grouped = (permissions.data ?? []).reduce<Record<string, typeof permissions.data>>(
    (acc, permission) => {
      const list = acc[permission.module] ?? [];
      list.push(permission);
      acc[permission.module] = list;
      return acc;
    },
    {},
  );
  const activeRole = roles.data?.find((role) => role.id === activeRoleId);

  return (
    <AppShell>
      <PageHeader
        title="Roles e permissões"
        description="Cada role define o que a equipe pode ver e fazer em cada módulo."
        action={
          canManage ? (
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 size-4" /> Nova role
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {roles.data?.map((role) => (
              <Button
                variant="ghost"
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  role.id === activeRoleId ? "bg-secondary font-semibold" : "hover:bg-secondary/60"
                }`}
              >
                <span>{role.name}</span>
                {role.is_system && <Badge variant="outline">sistema</Badge>}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div>
              <CardTitle className="font-display text-xl">{activeRole?.name ?? "—"}</CardTitle>
              <CardDescription>
                {activeRole?.description ?? "Selecione as permissões desta role."}
              </CardDescription>
            </div>
            {canManage && activeRole && !activeRole.is_system && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => deleteRole.mutate(activeRole.id)}
              >
                <Trash2 className="mr-1 size-4" /> Excluir
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(grouped).map(([module, items]) => (
              <div key={module}>
                <h2 className="text-sm font-semibold text-foreground">
                  {MODULE_LABELS[module] ?? module}
                </h2>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(items ?? []).map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={granted.has(permission.id)}
                        disabled={!canManage || togglePermission.isPending}
                        onCheckedChange={(checked) =>
                          togglePermission.mutate({
                            permissionId: permission.id,
                            enabled: checked === true,
                          })
                        }
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Permissões por campo (ex.: valores de eventos) serão liberadas em uma próxima etapa.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Nova role</DialogTitle>
            <DialogDescription>Depois de criar, marque as permissões desejadas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nome</Label>
              <Input
                id="role-name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">Descrição</Label>
              <Textarea
                id="role-desc"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createRole.mutate()} disabled={createRole.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
