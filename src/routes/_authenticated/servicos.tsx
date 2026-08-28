import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — Magic Moments" },
      { name: "description", content: "Catálogo de serviços oferecidos pela Magic Moments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ServicesPage,
});

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: "active" | "inactive";
  created_at: string;
}

interface ServiceForm {
  name: string;
  description: string;
  color: string;
  status: "active" | "inactive";
}

const emptyServiceForm: ServiceForm = {
  name: "",
  description: "",
  color: "#6335A7",
  status: "active",
};

const COLOR_PRESETS = [
  "#6335A7",
  "#F8C419",
  "#8B5CF6",
  "#3B82F6",
  "#22C55E",
  "#F97316",
  "#EC4899",
  "#14B8A6",
];

function ServicesPage() {
  const { can } = useCurrentUser();
  const queryClient = useQueryClient();

  const canCreate = can("services", "create");
  const canEdit = can("services", "edit");
  const canDelete = can("services", "delete");
  const canView = can("services", "view");

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyServiceForm);
  const [deleting, setDeleting] = useState<ServiceRow | null>(null);

  const services = useQuery({
    queryKey: ["services"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, color, status, created_at")
        .order("name");
      if (error) throw new Error("Não foi possível carregar os serviços.");
      return data as ServiceRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services.data ?? [];
    return (services.data ?? []).filter((service) =>
      [service.name, service.description].filter(Boolean).join(" ").toLowerCase().includes(term),
    );
  }, [services.data, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyServiceForm);
    setDialogOpen(true);
  }

  function openEdit(service: ServiceRow) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      color: service.color,
      status: service.status,
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (name.length < 2) throw new Error("Informe o nome do serviço.");

      const payload = {
        name,
        description: form.description.trim() || null,
        color: form.color,
        status: form.status,
      };

      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) throw new Error("Não foi possível salvar o serviço.");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("services")
        .insert({ ...payload, created_by: userData.user?.id ?? null });
      if (error) throw new Error("Não foi possível cadastrar o serviço.");
    },
    onSuccess: () => {
      toast.success(editing ? "Serviço atualizado." : "Serviço cadastrado.");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyServiceForm);
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw new Error("Não foi possível excluir. Verifique se há eventos vinculados.");
    },
    onSuccess: () => {
      toast.success("Serviço excluído.");
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!canView) {
    return (
      <AppShell>
        <PageHeader title="Serviços" description="Você não tem permissão para visualizar este módulo." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Serviços"
        description="Catálogo de serviços oferecidos nos eventos da Magic Moments."
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" /> Novo serviço
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
              placeholder="Buscar por nome ou descrição"
              className="pl-9"
              aria-label="Buscar serviços"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "serviço" : "serviços"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!services.isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <Sparkles className="mx-auto mb-3 size-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "Nenhum serviço encontrado para essa busca." : "Nenhum serviço cadastrado ainda."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="size-3.5 shrink-0 rounded-full ring-2 ring-border"
                        style={{ backgroundColor: service.color }}
                        aria-hidden
                      />
                      <p className="font-medium">{service.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-muted-foreground">
                    {service.description ? (
                      <p className="truncate">{service.description}</p>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        service.status === "active"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-muted-foreground/30 bg-muted text-muted-foreground",
                      )}
                    >
                      {service.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>
                          <Pencil className="mr-1 size-4" /> Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${service.name}`}
                          onClick={() => setDeleting(service)}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            <DialogDescription>Serviços aparecem como opção no cadastro de eventos.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Nome do serviço</Label>
              <Input
                id="s-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ex.: Cabine de fotos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-description">Descrição</Label>
              <Textarea
                id="s-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Detalhes do que está incluso no serviço"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor de identificação</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      aria-label={`Cor ${color}`}
                      className={cn(
                        "size-8 rounded-full transition-transform hover:scale-110",
                        form.color === color && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <Input
                    type="color"
                    value={form.color}
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                    className="h-8 w-12 cursor-pointer p-1"
                    aria-label="Cor personalizada"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Usada para destacar o serviço no calendário e nos eventos.
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Serviços inativos não aparecem para novos eventos.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
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
            <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleting?.name}</strong>? Essa ação não pode ser
              desfeita.
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
