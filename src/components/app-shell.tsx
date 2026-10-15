import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  ChevronDown,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  PartyPopper,
  Route as RouteIcon,
  Settings,
  Shield,
  Sparkles,
  Users,
  UsersRound,
  X, FileSignature } from "lucide-react";

import logo from "@/assets/magic-moments-logo.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { KeyRound } from "lucide-react";
import { PasswordChangeDialog } from "@/components/password-change-dialog";

interface NavItem {
  label: string;
  to?: string;
  icon: typeof LayoutDashboard;
  module: string;
  action: string;
  soon?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, module: "dashboard", action: "view" },
  { label: "Eventos", to: "/eventos", icon: PartyPopper, module: "events", action: "view" },
  { label: "Calendário", to: "/calendario", icon: CalendarDays, module: "calendar", action: "view" },
  { label: "Deslocamento", to: "/deslocamento", icon: RouteIcon, module: "events", action: "view" },
  { label: "Minha agenda", to: "/portal", icon: BriefcaseBusiness, module: "portal", action: "view" },
];

const SETTINGS_NAV: NavItem[] = [
  { label: "Clientes", to: "/clientes", icon: UsersRound, module: "clients", action: "view" },
  { label: "Serviços", to: "/servicos", icon: Sparkles, module: "services", action: "view" },
  { label: "Colaboradores", to: "/colaboradores", icon: HardHat, module: "collaborators", action: "view" },
  { label: "Ficha de contrato", to: "/configuracoes/ficha-contrato", icon: FileSignature, module: "settings", action: "view" },
  { label: "Usuários", to: "/configuracoes/usuarios", icon: Users, module: "users", action: "view" },
  { label: "Roles e permissões", to: "/configuracoes/roles", icon: Shield, module: "roles", action: "manage" },
  { label: "Backups", to: "/configuracoes/backups", icon: Shield, module: "roles", action: "manage" },
];


export function AppShell({ children, contentClassName }: { children: ReactNode; contentClassName?: string }) {
  const { user, can } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const settingsItems = SETTINGS_NAV.filter((item) => can(item.module, item.action));


  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (user?.name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card">
          <img src={logo} alt="Magic Moments" width={48} height={48} className="size-10 object-contain" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold">Magic Moments</p>
          <p className="text-xs text-sidebar-foreground/70">Painel interno</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {MAIN_NAV.filter((item) => can(item.module, item.action) || item.soon).map((item) => {
          const active = item.to ? pathname === item.to : false;
          const disabled = !item.to || !can(item.module, item.action);
          const Icon = item.icon;

          if (disabled) {
            return (
              <div
                key={item.label}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/45"
              >
                <Icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                {item.soon && (
                  <Badge variant="outline" className="border-sidebar-border text-[10px] text-sidebar-foreground/60">
                    em breve
                  </Badge>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to ?? "/"}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground ring-1 ring-sidebar-border"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}

        {settingsItems.length > 0 && (
          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex w-full justify-start gap-3 rounded-md px-3 py-2.5 text-sm font-normal text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <Settings className="size-4" />
              <span className="flex-1 text-left">Configurações</span>
              <ChevronDown className={cn("size-4 transition-transform", settingsOpen && "rotate-180")} />
            </Button>
            {settingsOpen && (
              <div className="mt-1 space-y-1 pl-4">
                {settingsItems.map((item) => {
                  const active = pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.to ?? "/"}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground ring-1 ring-sidebar-border"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {can("tasks", "view") && <div className="pt-4"><Link to="/tarefas" onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors", pathname === "/tarefas" ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground ring-1 ring-sidebar-border" : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60")}><ClipboardList className="size-4" />Tarefas</Link></div>}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={() => { setPasswordOpen(true); setMobileOpen(false); }}><KeyRound className="size-4" />Alterar senha</Button>
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="size-9 bg-sidebar-accent">
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{user?.roleName ?? "Sem role"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label="Sair"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <PasswordChangeDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-3 z-10 text-sidebar-foreground"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </Button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </Button>
          <span className="font-display text-base">Magic Moments</span>
        </header>
        <main className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8", contentClassName)}>{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
