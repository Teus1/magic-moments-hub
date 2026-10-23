import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { runManualBackup } from "@/lib/backup.functions";

export const Route = createFileRoute("/_authenticated/configuracoes/backups")({
  head: () => ({
    meta: [
      { title: "Backups — Magic Moments" },
      { name: "description", content: "Histórico das cópias semanais no Google Drive." },
      { property: "og:title", content: "Backups — Magic Moments" },
      { property: "og:description", content: "Histórico de backups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BackupsPage,
});

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

function BackupsPage() {
  const cache = useQueryClient();
  const run = useServerFn(runManualBackup);
  const runs = useQuery({
    queryKey: ["backup-runs"],
    queryFn: async () => {
      const r = await supabase
        .from("backup_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const mutation = useMutation({
    mutationFn: () => run(),
    onSuccess: (r) => {
      r.status === "success"
        ? toast.success("Backup concluído no Google Drive.")
        : toast.error("O backup falhou. Veja o motivo na lista.");
      void cache.invalidateQueries({ queryKey: ["backup-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AppShell>
      <PageHeader
        title="Backups"
        description="Cópia completa toda semana (domingo, 03h00 de Brasília) na pasta “Magic Moments - Backups” do Google Drive."
        action={
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Copiando…" : "Fazer backup agora"}
          </Button>
        }
      />
      {runs.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !runs.data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum backup feito ainda.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {runs.data.map((r) => {
            const total = Object.values((r.table_counts ?? {}) as Record<string, number>).reduce(
              (a, b) => a + b,
              0,
            );
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">
                    {fmt(r.started_at)} · {r.trigger === "manual" ? "Manual" : "Automático"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {total} registros · {r.attachments_count} anexos{r.error ? ` · ${r.error}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      r.status === "success"
                        ? "default"
                        : r.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {r.status === "success"
                      ? "Concluído"
                      : r.status === "failed"
                        ? "Falhou"
                        : "Em andamento"}
                  </Badge>
                  {r.folder_url && (
                    <a
                      className="text-sm text-primary underline"
                      href={r.folder_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir pasta
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
