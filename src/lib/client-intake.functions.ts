import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";
import {
  clientPayload,
  clientSchema,
  intakeSchema,
  validCpf,
  type IntakeRow,
} from "@/lib/client-intake";
import { onlyDigits } from "@/lib/clients";
import { intakeRecipientSchema, intakeTokenSchema, newIntakeToken, intakeShareUrl } from "@/lib/intake-links";

const tokenSchema = intakeTokenSchema;
async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export const createIntakeLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        client_id: z.string().uuid().nullable(),
        event_id: z.string().uuid().nullable(),
        recipient_name: intakeRecipientSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "clients", "create");
    const token = newIntakeToken();
    const shareUrl = intakeShareUrl(token);
    const result = await context.supabase
      .from("client_preregistrations")
      .insert({ ...data, token_hash: await hashToken(token), created_by: context.userId, share_url: shareUrl })
      .select("id")
      .single();
    if (result.error)
      throw new Error("Não foi possível gerar o link. Verifique o cliente e suas permissões.");
    return { token, id: result.data.id, shareUrl };
  });
export const listIntakes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntakeRow[]> => {
    await assertCan(context.supabase, "clients", "view");
    const rows: IntakeRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const response = await context.supabase
        .from("client_preregistrations")
        .select(
          "id,recipient_name,status,client_id,event_id,payload,created_at,received_at,reviewed_at,expires_at,notified_at,share_url",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (response.error) throw new Error("Não foi possível carregar os pré-cadastros.");
      rows.push(...(response.data as unknown as IntakeRow[]));
      if (response.data.length < 500) return rows;
    }
  });
export const deleteIntakeLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "clients", "view");
    await assertCan(context.supabase, "clients", "delete");
    const result = await context.supabase.rpc("delete_client_intake_link", { _id: data.id });
    if (result.error) throw new Error("Não foi possível excluir o link. Confira suas permissões.");
    return { ok: true };
  });
// Possession of a single-use, expiring invitation authorizes only its submission.
// No public read returns names, CPF, previous answers or internal associations.
export const intakeLinkStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const response = await supabaseAdmin
      .from("client_preregistrations")
      .select("status,expires_at")
      .is("deleted_at", null)
      .eq("token_hash", await hashToken(data.token))
      .maybeSingle();
    if (response.error) throw new Error("Não foi possível verificar o link. Tente novamente.");
    if (!response.data || new Date(response.data.expires_at).getTime() <= Date.now())
      return { status: "expired" as const };
    return {
      status: response.data.status === "pending" ? ("pending" as const) : ("received" as const),
    };
  });
/** Resolve a valid pending invitation; used to authorize public helper reads. */
export async function pendingInvitation(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const response = await supabaseAdmin
    .from("client_preregistrations")
    .select("id,status,expires_at")
    .is("deleted_at", null)
    .eq("token_hash", await hashToken(token))
    .maybeSingle();
  if (
    response.error ||
    !response.data ||
    response.data.status !== "pending" ||
    new Date(response.data.expires_at).getTime() <= Date.now()
  )
    throw new Error("Link inválido ou expirado.");
  return supabaseAdmin;
}
export const publicServices = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }) => {
    const admin = await pendingInvitation(data.token);
    const response = await admin
      .from("services")
      .select("id,name,description")
      .eq("status", "active")
      .order("name");
    if (response.error) throw new Error("Não foi possível carregar os serviços.");
    return response.data;
  });
export const markIntakeNotified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "clients", "view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin
      .from("client_preregistrations")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("notified_at", null);
    if (result.error) throw new Error("Não foi possível registrar o aviso.");
    return { ok: true };
  });
export const submitIntake = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: tokenSchema, draft: intakeSchema, website: z.literal("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("submit_client_preregistration", {
      _hash: await hashToken(data.token),
      _payload: {
        ...data.draft,
        cpf: onlyDigits(data.draft.cpf),
        whatsapp: onlyDigits(data.draft.whatsapp),
        zip_code: onlyDigits(data.draft.zip_code),
      },
    });
    // Automatic WhatsApp delivery to active recipients plugs in here once a provider is chosen.
    if (result.error)
      throw new Error(
        "Não foi possível enviar. O link pode ter expirado; entre em contato com a Magic Moments.",
      );
    // Only after a successful submission: expose active company recipients (name + phone) for the wa.me button.
    const recipients = await supabaseAdmin
      .from("whatsapp_notification_recipients")
      .select("name,phone")
      .eq("active", true)
      .order("name");
    return { status: result.data, recipients: recipients.error ? [] : recipients.data };
  });
export const reviewIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        client_id: z.string().uuid().nullable(),
        fill_missing: z.boolean(),
        corrections: clientSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "clients", "edit");
    await assertCan(context.supabase, "clients", "view");
    if (data.corrections) {
      const c = data.corrections;
      if (!validCpf(c.cpf) || !/^\d{10,11}$/.test(onlyDigits(c.whatsapp)))
        throw new Error("Confira CPF e WhatsApp antes de validar.");
      const current = await context.supabase
        .from("client_preregistrations")
        .select("payload,status")
        .is("deleted_at", null)
        .eq("id", data.id)
        .single();
      if (current.error || current.data.status !== "received")
        throw new Error("Ficha não disponível para correção.");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const payload = {
        ...(current.data.payload as Record<string, unknown>),
        ...c,
        cpf: onlyDigits(c.cpf),
        whatsapp: onlyDigits(c.whatsapp),
        zip_code: onlyDigits(c.zip_code),
      };
      const saved = await supabaseAdmin
        .from("client_preregistrations")
        .update({ payload })
        .eq("id", data.id)
        .eq("status", "received");
      if (saved.error) throw new Error("Não foi possível salvar as correções.");
    }
    // The generated RPC types omit SQL argument nullability; PostgreSQL accepts
    // null here to request creation after the duplicate check in the transaction.
    const result = await context.supabase.rpc("review_client_preregistration", {
      _id: data.id,
      _client_id: data.client_id as unknown as string,
      _fill_missing: data.fill_missing,
    });
    if (result.error)
      throw new Error(
        result.error.message.includes("correspondente")
          ? "Já existe um cliente com CPF, WhatsApp ou e-mail correspondente. Selecione o cadastro existente."
          : "Não foi possível revisar. Confira o vínculo e suas permissões.",
      );
    return { client_id: result.data };
  });
export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable(), draft: clientSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "clients", data.id ? "edit" : "create");
    const payload = clientPayload(data.draft);
    const result = data.id
      ? await context.supabase
          .from("clients")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : await context.supabase
          .from("clients")
          .insert({ ...payload, created_by: context.userId })
          .select("id")
          .single();
    if (result.error)
      throw new Error("Não foi possível salvar o cliente. Verifique suas permissões.");
    return result.data;
  });
