import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
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
  X,
  FileSignature,
  KeyRound,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

import logo from "@/assets/magic-moments-logo.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTheme } from "@/components/theme-provider";
import { PasswordChangeDialog } from "@/components/password-change-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type Theme = "light" | "dark" | "system";

interface NavItem {
  label: string;
  to?: string;
  icon: typeof LayoutDashboard;
  module: string;
  action: string;
  soon?: boolean;
}

const MAIN_NAV: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
    action: "view",
  },
  { label: "Eventos", to: "/eventos", icon: PartyPopper, module: "events", action: "view" },
  {
    label: "Calendário",
    to: "/calendario",
    icon: CalendarDays,
    module: "calendar",
    action: "view",
  },
  { label: "Deslocamento", to: "/deslocamento", icon: RouteIcon, module: "events", action: "view" },
  {
    label: "Minha agenda",
    to: "/portal",
    icon: BriefcaseBusiness,
    module: "portal",
    action: "view",
  },
];

const SETTINGS_NAV: NavItem[] = [
  { label: "Clientes", to: "/clientes", icon: UsersRound, module: "clients", action: "view" },
  { label: "Serviços", to: "/servicos", icon: Sparkles, module: "services", action: "view" },
  {
    label: "Colaboradores",
    to: "/colaboradores",
    icon: HardHat,
    module: "collaborators",
    action: "view",
  },
  {
    label: "Ficha de contrato",
    to: "/configuracoes/ficha-contrato",
    icon: FileSignature,
    module: "settings",
    action: "view",
  },
  {
    label: "Usuários",
    to: "/configuracoes/usuarios",
    icon: Users,
    module: "users",
    action: "view",
  },
  {
    label: "Roles e permissões",
    to: "/configuracoes/roles",
    icon: Shield,
    module: "roles",
    action: "manage",
  },
  {
    label: "Backups",
    to: "/configuracoes/backups",
    icon: Shield,
    module: "roles",
    action: "manage",
  },
];

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const icons = {
    light: <Sun className="size-4" />,
    dark: <Moon className="size-4" />,
    system: <Monitor className="size-4" />,
  };

  // Durante SSR e primeiro render no cliente, usar "system" para evitar hydration mismatch
  // Após mount, usar o tema real do localStorage
  const displayTheme = mounted ? (theme ?? "system") : "system";
  const currentTheme = displayTheme;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            onClick={() => {
              const themes: Theme[] = ["light", "dark", "system"];
              const currentIndex = themes.indexOf(currentTheme);
              const nextIndex = (currentIndex + 1) % themes.length;
              const nextTheme = themes[nextIndex] ?? "system";
              setTheme(nextTheme);
            }}
            aria-label={`Tema atual: ${currentTheme === "system" ? "Sistema" : currentTheme === "light" ? "Claro" : "Escuro"}. Clique para alternar.`}
          >
            {icons[currentTheme]}
            <span className="sr-only">
              {currentTheme === "system" ? "Sistema" : currentTheme === "light" ? "Claro" : "Escuro"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            {icons[currentTheme]}
            <span>
              {currentTheme === "system" ? "Sistema" : currentTheme === "light" ? "Claro" : "Escuro"}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CollapsedNavItem({
  item,
  active,
  disabled,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex cursor-not-allowed items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/45",
                "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full",
              )}
            >
              <Icon className="size-4" />
              <span className="sidebar-collapsed-hidden">{item.label}</span>
              {item.soon && (
                <Badge
                  variant="outline"
                  className="border-sidebar-border text-[10px] text-sidebar-foreground/60 sidebar-collapsed-hidden"
                >
                  em breve
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.to ?? "/"}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
              "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold ring-1 ring-sidebar-border"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="sidebar-collapsed-hidden truncate">{item.label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" hidden={!active}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ExpandedNavItem({
  item,
  active,
  disabled,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  if (disabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/45 cursor-not-allowed",
        )}
      >
        <Icon className="size-4" />
        <span className="flex-1">{item.label}</span>
        {item.soon && (
          <Badge
            variant="outline"
            className="border-sidebar-border text-[10px] text-sidebar-foreground/60"
          >
            em breve
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.to ?? "/"}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold ring-1 ring-sidebar-border"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SettingsSection({ items, pathname, onCloseMobile }: { items: NavItem[]; pathname: string; onCloseMobile: () => void }) {
  const { can } = useCurrentUser();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Settings className="size-4 shrink-0" />
        <span className="sidebar-collapsed-hidden">Configurações</span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.to;
            const disabled = !item.to || !can(item.module, item.action);
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.label}>
                {isCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          disabled={disabled}
                          onClick={onCloseMobile}
                        >
                          <Link to={item.to ?? "/"} onClick={onCloseMobile}>
                            <Icon className="size-4 shrink-0" />
                            <span className="sidebar-collapsed-hidden truncate">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <SidebarMenuButton asChild isActive={active} disabled={disabled} onClick={onCloseMobile}>
                    <Link to={item.to ?? "/"} onClick={onCloseMobile}>
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function TasksSection({ pathname, onCloseMobile }: { pathname: string; onCloseMobile: () => void }) {
  const { can } = useCurrentUser();
  if (!can("tasks", "view")) return null;

  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const active = pathname === "/tarefas";

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            {isCollapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      onClick={onCloseMobile}
                    >
                      <Link to="/tarefas" onClick={onCloseMobile}>
                        <ClipboardList className="size-4 shrink-0" />
                        <span className="sidebar-collapsed-hidden">Tarefas</span>
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">Tarefas</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <SidebarMenuButton asChild isActive={active} onClick={onCloseMobile}>
                <Link to="/tarefas" onClick={onCloseMobile}>
                  <ClipboardList className="size-4 shrink-0" />
                  <span>Tarefas</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppShell({
  children,
  contentClassName,
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  const { user, can } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";

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

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent/50">
            <img
              src={logo}
              alt="Magic Moments"
              width={40}
              height={40}
              className="size-8 object-contain"
            />
          </div>
          <div className="flex-1 min-w-0 leading-tight sidebar-collapsed-hidden">
            <p className="font-display text-sm font-semibold truncate">Magic Moments</p>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">Painel interno</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.filter((item) => can(item.module, item.action) || item.soon).map((item) => {
                const active = item.to ? pathname === item.to : false;
                const disabled = !item.to || !can(item.module, item.action);
                return (
                  <SidebarMenuItem key={item.label}>
                    {isCollapsed ? (
                      <CollapsedNavItem item={item} active={active} disabled={disabled} onClick={closeMobile} />
                    ) : (
                      <ExpandedNavItem item={item} active={active} disabled={disabled} onClick={closeMobile} />
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {settingsItems.length > 0 && (
          <SettingsSection items={settingsItems} pathname={pathname} onCloseMobile={closeMobile} />
        )}

        <TasksSection pathname={pathname} onCloseMobile={closeMobile} />
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarSeparator />
        <div className="space-y-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  asChild
                  variant="outline"
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  onClick={() => {
                    setPasswordOpen(true);
                    closeMobile();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setPasswordOpen(true); closeMobile(); }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
                  >
                    <KeyRound className="size-4 shrink-0" />
                    <span className="sidebar-collapsed-hidden">Alterar senha</span>
                  </button>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">Alterar senha</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar className="size-8 bg-sidebar-accent">
              <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight sidebar-collapsed-hidden">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">
                {user?.roleName ?? "Sem role"}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={handleSignOut}
                    aria-label="Sair"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">Sair</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <ThemeToggle />
        </div>
      </SidebarFooter>
    </div>
  );

  return (
    <SidebarProvider defaultOpen={true}>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-background">
          <PasswordChangeDialog open={passwordOpen} onOpenChange={setPasswordOpen} />

          <Sidebar>
            {sidebarContent}
            <SidebarRail />
          </Sidebar>

          <SidebarInset>
            {mobileOpen && (
              <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
                <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
              </div>
            )}

            <header className="flex items-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 lg:hidden sticky top-0 z-30">
              <SidebarTrigger className="-ml-1" />
              <div className="flex-1" />
              <ThemeToggle />
            </header>

            <main
              className={cn(
                "app-content mx-auto min-w-0 w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8",
                contentClassName,
              )}
            >
              {children}
            </main>
          </SidebarInset>
        </div>
      </TooltipProvider>
    </SidebarProvider>
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
    <div className="page-header mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:mb-8 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="break-words font-display text-2xl text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}