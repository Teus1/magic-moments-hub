import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, PartyPopper, Sparkles, UsersRound } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Magic Moments" },
      { name: "description", content: "Visão geral operacional da Magic Moments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const NEXT_STEPS = [
  { icon: UsersRound, title: "Clientes", text: "Cadastro completo de clientes e histórico." },
  { icon: PartyPopper, title: "Eventos", text: "Eventos, serviços contratados e valores." },
  { icon: CalendarDays, title: "Calendário", text: "Agenda visual dos eventos da equipe." },
  { icon: Sparkles, title: "Serviços", text: "Catálogo de serviços oferecidos." },
];

function DashboardPage() {
  const { user } = useCurrentUser();

  return (
    <AppShell>
      <PageHeader
        title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`}
        description="Este é o painel interno da Magic Moments. Os módulos operacionais serão liberados nas próximas etapas."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Seu acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl">{user?.roleName ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{user?.permissions.length ?? 0} permissões ativas</p>
          </CardContent>
        </Card>
        {NEXT_STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 text-primary" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
