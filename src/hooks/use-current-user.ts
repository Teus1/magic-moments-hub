import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { permissionKey } from "@/lib/permissions";

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  status: "active" | "inactive";
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, username, email, status, role_id, roles(name)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  let permissions: string[] = [];
  if (profile.role_id) {
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("permissions(module, action)")
      .eq("role_id", profile.role_id);
    permissions = (perms ?? [])
      .map((row) => row.permissions)
      .filter((p): p is { module: string; action: string } => Boolean(p))
      .map((p) => permissionKey(p.module, p.action));
  }

  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    email: profile.email,
    status: profile.status,
    roleId: profile.role_id,
    roleName: profile.roles?.name ?? null,
    permissions,
  };
}

export const currentUserQueryKey = ["current-user"] as const;

export function useCurrentUser() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    staleTime: 30_000,
  });

  const permissions = query.data?.permissions ?? [];
  const can = (module: string, action: string) =>
    permissions.includes(permissionKey(module, action));
  const canAny = (module: string) => permissions.some((p) => p.startsWith(`${module}.`));

  return {
    ...query,
    user: query.data ?? null,
    can,
    canAny,
    refresh: () => queryClient.invalidateQueries({ queryKey: currentUserQueryKey }),
  };
}
