import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runManualBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("status, roles(slug)")
      .eq("id", context.userId)
      .maybeSingle();
    const slug = (data as { roles?: { slug?: string } | null } | null)?.roles?.slug;
    if (!data || data.status !== "active" || slug !== "administrador") throw new Error("Apenas Administrador pode fazer backup.");
    const { runBackup } = await import("@/lib/backup.server");
    return runBackup("manual", context.userId);
  });
