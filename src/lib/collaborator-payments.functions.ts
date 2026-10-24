import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";
import { COLLABORATOR_PAYMENT_METHODS } from "@/lib/collaborator-payments";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Registra um pagamento da equipe (valor, data, método e categoria) com permissão verificada no servidor. */
export const registerCollaboratorPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { linkId: string; amount: number; paidAt: string; method: string; category: "service" | "transport" }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "events", "edit");

    if (!UUID.test(data.linkId)) throw new Error("Pagamento não encontrado.");
    const amount = Math.round(Number(data.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error("Informe um valor maior que zero.");
    if (amount > 999999.99) throw new Error("Valor acima do permitido.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.paidAt)) throw new Error("Informe uma data válida.");
    const method = COLLABORATOR_PAYMENT_METHODS.find((item) => item.value === data.method);
    if (!method) throw new Error("Selecione um método de pagamento.");
    if (data.category !== "service" && data.category !== "transport")
      throw new Error("Categoria inválida. Use 'service' ou 'transport'.");

    const { data: link, error: linkError } = await context.supabase
      .from("event_collaborators")
      .select("id")
      .eq("id", data.linkId)
      .maybeSingle();
    if (linkError) throw new Error("Não foi possível conferir este pagamento.");
    if (!link) throw new Error("Pagamento não encontrado.");

    const { error } = await context.supabase.from("collaborator_payments").insert({
      event_collaborator_id: data.linkId,
      amount,
      paid_at: data.paidAt,
      method: method.value,
      category: data.category,
      created_by: context.userId,
    });
    if (error) throw new Error("Não foi possível registrar o pagamento.");

    return { ok: true, amount };
  });
