import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";
import { clientPayload, clientSchema, intakeSchema, type IntakeRow } from "@/lib/client-intake";
import { onlyDigits } from "@/lib/clients";

const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
export const createIntakeLink = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ client_id: z.string().uuid().nullable(), event_id: z.string().uuid().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "clients", "create");
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
    const result = await context.supabase.from("client_preregistrations").insert({ ...data, token_hash: await hashToken(token), created_by: context.userId }).select("id").single();
    if (result.error) throw new Error("Não foi possível gerar o link. Verifique o cliente e suas permissões.");
    return { token, id: result.data.id };
  });
export const listIntakes = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntakeRow[]> => {
    await assertCan(context.supabase, "clients", "view");
    const rows: IntakeRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const response = await context.supabase.from("client_preregistrations").select("id,status,client_id,event_id,payload,created_at,received_at,reviewed_at,expires_at").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (response.error) throw new Error("Não foi possível carregar os pré-cadastros.");
      rows.push(...response.data as unknown as IntakeRow[]);
      if (response.data.length < 500) return rows;
    }
  });
// Possession of a single-use, expiring invitation authorizes only its submission.
// No public read returns names, CPF, previous answers or internal associations.
export const intakeLinkStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const response = await supabaseAdmin.from("client_preregistrations").select("status,expires_at").eq("token_hash", await hashToken(data.token)).maybeSingle();
    if (response.error) throw new Error("Não foi possível verificar o link. Tente novamente.");
    if (!response.data || new Date(response.data.expires_at).getTime() <= Date.now()) return { status: "expired" as const };
    return { status: response.data.status === "pending" ? "pending" as const : "received" as const };
  });
export const submitIntake = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema, draft: intakeSchema, website: z.literal("") }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("submit_client_preregistration", { _hash: await hashToken(data.token), _payload: { ...data.draft, cpf: onlyDigits(data.draft.cpf), whatsapp: onlyDigits(data.draft.whatsapp), zip_code: onlyDigits(data.draft.zip_code) } });
    if (result.error) throw new Error("Não foi possível enviar. O link pode ter expirado; entre em contato com a Magic Moments.");
    return { status: result.data };
  });
export const reviewIntake = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), client_id: z.string().uuid().nullable(), fill_missing: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "clients", "edit");
    await assertCan(context.supabase, "clients", "view");
    // The generated RPC types omit SQL argument nullability; PostgreSQL accepts
    // null here to request creation after the duplicate check in the transaction.
    const result = await context.supabase.rpc("review_client_preregistration", { _id: data.id, _client_id: data.client_id as unknown as string, _fill_missing: data.fill_missing });
    if (result.error) throw new Error(result.error.message.includes("correspondente") ? "Já existe um cliente com CPF, WhatsApp ou e-mail correspondente. Selecione o cadastro existente." : "Não foi possível revisar. Confira o vínculo e suas permissões.");
    return { client_id: result.data };
  });
export const saveClient = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid().nullable(), draft: clientSchema }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "clients", data.id ? "edit" : "create");
    const payload = clientPayload(data.draft);
    const result = data.id ? await context.supabase.from("clients").update(payload).eq("id", data.id).select("id").single() : await context.supabase.from("clients").insert({ ...payload, created_by: context.userId }).select("id").single();
    if (result.error) throw new Error("Não foi possível salvar o cliente. Verifique suas permissões.");
    return result.data;
  });