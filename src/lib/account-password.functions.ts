import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { passwordChangeSchema } from "@/lib/account-password";

export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => passwordChangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const current = await context.supabase.auth.getUser();
    if (current.error || current.data.user?.id !== context.userId || !current.data.user.email) {
      throw new Error("Entre novamente para alterar sua senha.");
    }
    // Reauthenticate only this request-local, non-persistent client, never the browser session.
    const verified = await context.supabase.auth.signInWithPassword({
      email: current.data.user.email,
      password: data.currentPassword,
    });
    if (verified.error || verified.data.user?.id !== context.userId) {
      throw new Error(
        "Senha atual incorreta ou verificação indisponível. Confira e tente novamente.",
      );
    }
    const updated = await context.supabase.auth.updateUser({
      password: data.password,
      current_password: data.currentPassword,
    });
    if (updated.error) {
      if (updated.error.code === "same_password")
        throw new Error("Escolha uma senha diferente da atual.");
      if (updated.error.code === "weak_password")
        throw new Error(
          "A autenticação não aceitou essa senha. Confira as regras de senha da conta.",
        );
      throw new Error("Não foi possível alterar a senha. Tente novamente.");
    }
    return { ok: true };
  });
