import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan, usernameToEmail, validatePassword, validateUsername } from "@/lib/admin.server";

export const getSetupState = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error("Não foi possível verificar o estado do sistema.");
  return { needsSetup: (count ?? 0) === 0 };
});

export const createInitialAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("O sistema já possui usuários cadastrados.");

    const username = validateUsername(data.username);
    validatePassword(data.password);

    const { data: role } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("slug", "administrador")
      .maybeSingle();
    if (!role) throw new Error("Role Administrador não encontrada.");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, username },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Não foi possível criar o administrador.");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.data.user.id,
      name: data.name.trim(),
      username,
      role_id: role.id,
      status: "active",
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.data.user.id);
      throw new Error("Não foi possível criar o perfil do administrador.");
    }

    return { ok: true, username };
  });

export const createSystemUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      name: string;
      username: string;
      email?: string | null;
      password: string;
      roleId: string;
      status: "active" | "inactive";
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "users", "create");

    const username = validateUsername(data.username);
    validatePassword(data.password);
    if (!data.name.trim()) throw new Error("Informe o nome do usuário.");
    if (!data.roleId) throw new Error("Selecione uma Role para o usuário.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) throw new Error("Este login já está em uso.");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, username },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Não foi possível criar o usuário.");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.data.user.id,
      name: data.name.trim(),
      username,
      email: data.email?.trim() || null,
      role_id: data.roleId,
      status: data.status,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.data.user.id);
      throw new Error("Não foi possível salvar o perfil do usuário.");
    }

    return { ok: true, id: created.data.user.id };
  });

export const createCollaboratorWithAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      fullName: string;
      nickname?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      email?: string | null;
      roleTitle?: string | null;
      notes?: string | null;
      status: "active" | "inactive";
      username: string;
      password: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "collaborators", "create");
    await assertCan(context.supabase, "users", "create");

    const fullName = data.fullName.trim();
    if (fullName.length < 2) throw new Error("Informe o nome do colaborador.");
    const username = validateUsername(data.username);
    validatePassword(data.password);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: existing }, { data: collaboratorRole, error: roleError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id").eq("username", username).maybeSingle(),
      supabaseAdmin.from("roles").select("id").eq("slug", "colaborador").maybeSingle(),
    ]);
    if (existing) throw new Error("Este login já está em uso.");
    if (roleError || !collaboratorRole) throw new Error("A role Colaborador não foi encontrada.");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { name: fullName, username },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Não foi possível criar a conta de acesso.");
    }

    const userId = created.data.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      name: fullName,
      username,
      email: data.email?.trim() || null,
      role_id: collaboratorRole.id,
      status: data.status,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não foi possível salvar a conta do colaborador.");
    }

    const { data: collaborator, error: collaboratorError } = await supabaseAdmin
      .from("collaborators")
      .insert({
        full_name: fullName,
        nickname: data.nickname?.trim() || null,
        phone: data.phone?.trim() || null,
        whatsapp: data.whatsapp?.trim() || null,
        email: data.email?.trim() || null,
        role_title: data.roleTitle?.trim() || null,
        notes: data.notes?.trim() || null,
        status: data.status,
        profile_id: userId,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (collaboratorError || !collaborator) {
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não foi possível cadastrar o colaborador e sua conta.");
    }

    return { ok: true, collaboratorId: collaborator.id, userId };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; password: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "users", "edit");
    validatePassword(data.password);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error("Não foi possível redefinir a senha.");
    return { ok: true };
  });
