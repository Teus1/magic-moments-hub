import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";
import { REFERRAL_VALUES } from "@/lib/event-extra";
import { isoDate } from "@/lib/client-intake";
import { calculatedEnd, eventTimeSchema } from "@/lib/event-timing";
const nullableText = (max: number) => z.string().trim().max(max).nullable();
export const eventDraftSchema = z.object({
  client_id: z.string().uuid(),
  service_id: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(200),
  event_type: nullableText(100),
  event_date: isoDate,
  start_time: eventTimeSchema.nullable(),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .nullable(),
  duration_minutes: z.number().int().min(1).max(1439).nullable(),
  venue: nullableText(300),
  address: nullableText(1000),
  venue_city: nullableText(150),
  venue_state: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  place_id: nullableText(300),
  has_ceremonial: z.boolean(),
  ceremonial_name: nullableText(200),
  ceremonial_contact: nullableText(255),
  contact_via_ceremonial: z.boolean(),
  has_guestbook: z.boolean(),
  attraction_id: z.string().uuid().nullable(),
  attraction_start_location: nullableText(300),
  guest_count: z.number().int().min(1).max(100000).nullable(),
  social_media_consent: z.boolean().nullable(),
  instagram_handles: nullableText(300),
  referral_source: z.enum(REFERRAL_VALUES).nullable(),
  referral_other: nullableText(150),
  status: z.enum(["planned", "cancelled"]),
  contracted_value: z.number().finite().min(0),
  notes: nullableText(40000),
  preregistration_id: z.string().uuid().nullable(),
});
export const saveEventDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable(), draft: eventDraftSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "events", data.id ? "edit" : "create");
    const draft = { ...data.draft };
    const end = calculatedEnd(draft.start_time ?? "", draft.duration_minutes);
    if (draft.duration_minutes !== null && !end)
      throw new Error("Confira o início e a duração do evento.");
    if (end) draft.end_time = end.time;
    if (!end) {
      if (!data.id && draft.end_time !== null) throw new Error("Informe a duração do evento.");
      if (data.id) {
        const old = await context.supabase
          .from("events")
          .select("start_time,end_time,duration_minutes")
          .eq("id", data.id)
          .single();
        if (old.error) throw new Error("Evento não disponível.");
        if (
          draft.end_time !== old.data.end_time &&
          draft.end_time !== old.data.end_time?.slice(0, 5)
        )
          throw new Error("O término não pode ser editado manualmente.");
        if (draft.start_time !== old.data.start_time?.slice(0, 5) && draft.end_time)
          throw new Error("Informe a duração antes de alterar o início deste evento histórico.");
      }
    }
    const result = data.id
      ? await context.supabase.from("events").update(draft).eq("id", data.id).select("id").single()
      : await context.supabase
          .from("events")
          .insert({ ...draft, created_by: context.userId })
          .select("id")
          .single();
    if (result.error)
      throw new Error("Não foi possível salvar o evento. Confira os vínculos e suas permissões.");
    return result.data;
  });

const transportValueSchema = z.object({
  event_id: z.string().uuid(),
  collaborator_id: z.string().uuid(),
  transport_value: z.number().finite().min(0),
});

/** Atualiza o valor de deslocamento/transporte de um colaborador no evento. */
export const updateEventCollaboratorTransport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(transportValueSchema.parse)
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "events", "edit");
    const { event_id, collaborator_id, transport_value } = data;
    // Busca o agreed_value atual (sem o valor de transporte anterior)
    const { data: current, error: fetchError } = await context.supabase
      .from("event_collaborators")
      .select("agreed_value, transport_value")
      .eq("event_id", event_id)
      .eq("collaborator_id", collaborator_id)
      .single();
    if (fetchError) throw new Error("Não foi possível buscar o colaborador do evento.");
    // Calcula o novo agreed_value: remove o transport_value antigo (se houver) e adiciona o novo
    const currentTransport = current?.transport_value ?? 0;
    const baseAgreed = (current?.agreed_value ?? 0) - currentTransport;
    const newAgreed = baseAgreed + transport_value;
    
    const { error } = await context.supabase
      .from("event_collaborators")
      .update({
        agreed_value: Math.round(newAgreed * 100) / 100,
        transport_value: Math.round(transport_value * 100) / 100,
        is_transport_responsible: true,
      })
      .eq("event_id", event_id)
      .eq("collaborator_id", collaborator_id);
    if (error) throw new Error("Não foi possível atualizar o valor de deslocamento.");
    return { ok: true };
  });
