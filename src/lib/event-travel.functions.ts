import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";
import { eventDestination } from "@/lib/event-travel";

/** Calcula (ida e volta) e guarda a estimativa de deslocamento de até 5 eventos por chamada. */
export const computeEventTravel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventIds: z.array(z.string().uuid()).min(1).max(5) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "events", "view");
    const { fetchTravelLeg } = await import("@/lib/travel.server");
    const settings = await context.supabase.from("travel_settings").select("base_address").maybeSingle();
    const origin = settings.data?.base_address?.trim() ?? "";
    if (origin.length < 5) throw new Error("Cadastre o endereço da empresa em Configurações > Ficha de contrato.");
    const events = await context.supabase.from("events").select("id,address,venue,venue_city,venue_state").in("id", data.eventIds);
    if (events.error) throw new Error("Não foi possível carregar os eventos.");
    const failures: string[] = [];
    for (const ev of events.data) {
      const destination = eventDestination(ev);
      if (!destination) continue;
      try {
        const [outbound, inbound] = await Promise.all([fetchTravelLeg(origin, destination), fetchTravelLeg(destination, origin)]);
        const toll = outbound.toll === null || inbound.toll === null ? null : outbound.toll + inbound.toll;
        const saved = await context.supabase.from("event_travel_estimates").upsert({ event_id: ev.id, origin, destination, distance_km: outbound.distanceKm + inbound.distanceKm, duration_seconds: Math.round(outbound.durationSeconds + inbound.durationSeconds), toll, calculated_at: new Date().toISOString() }, { onConflict: "event_id" });
        if (saved.error) throw new Error(saved.error.message);
      } catch (error) {
        console.error("event travel", ev.id, error);
        failures.push(ev.id);
      }
    }
    return { failures };
  });
