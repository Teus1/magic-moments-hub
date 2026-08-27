import { normalizeUsername, usernameToEmail } from "@/lib/permissions";

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

/** Verificação de permissão no backend (não confie apenas na interface). */
export async function assertCan(supabase: RpcClient, module: string, action: string) {
  const { data, error } = await supabase.rpc("can", { _module: module, _action: action });
  if (error) throw new Error("Não foi possível verificar suas permissões.");
  if (data !== true) throw new Error("Você não tem permissão para executar esta ação.");
}

export function validatePassword(password: string) {
  if (!password || password.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3) {
    throw new Error("O login deve ter pelo menos 3 caracteres (letras, números, . _ -).");
  }
  return normalized;
}

export { usernameToEmail };
