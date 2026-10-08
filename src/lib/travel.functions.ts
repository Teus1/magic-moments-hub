import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";
import { parseTravelLeg, type TravelRoute } from "@/lib/travel";

const schema = z.object({
  origin: z.string().trim().min(5).max(300),
  destination: z.string().trim().min(5).max(300),
  roundTrip: z.boolean(),
  avoidTolls: z.boolean(),
});
const cache = new Map<string, { expires: number; result: Promise<TravelRoute> }>();

export const getTravelRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<TravelRoute> => {
    await assertCan(context.supabase, "events", "view");
    const apiKey = process.env['GOOGLE_MAPS_API_KEY'];
    const lovableKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey || !lovableKey) throw new Error("Conecte o Google Maps para consultar trajetos.");
    const key = JSON.stringify(data);
    const saved = cache.get(key);
    if (saved && saved.expires > Date.now()) return saved.result;
    async function leg(origin: string, destination: string) {
      const response = await fetch("https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes", {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": apiKey ?? "",
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo",
        },
        body: JSON.stringify({ origin: { address: origin }, destination: { address: destination }, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", languageCode: "pt-BR", regionCode: "BR", units: "METRIC", extraComputations: ["TOLLS"], routeModifiers: { avoidTolls: data.avoidTolls, vehicleInfo: { emissionType: "GASOLINE" } } }),
      });
      if (!response.ok) {
        const body = await response.text();
        console.error(`Google Maps [${response.status}]: ${body}`);
        if (response.status === 403) {
          let reason: string | undefined;
          try { reason = JSON.parse(body)?.error?.details?.find((item: { reason?: string }) => item.reason)?.reason; } catch { /* Preserve status and body below. */ }
          if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error(`Google Maps [403]: ajuste a chave de servidor para restrição por IP ou sem restrição de site. ${body}`);
          if (reason === "API_KEY_SERVICE_BLOCKED") throw new Error(`Google Maps [403]: habilite a Routes API e permita seu uso na chave de servidor. ${body}`);
        }
        throw new Error(`Google Maps [${response.status}]: ${body}`);
      }
      const payload = await response.json() as { routes?: unknown[] };
      if (!payload.routes?.length) throw new Error("Nenhum trajeto encontrado. Confira os endereços e as cidades.");
      return parseTravelLeg(payload.routes[0]);
    }
    const result = (async () => {
      const [outbound, inbound] = await Promise.all([leg(data.origin, data.destination), data.roundTrip ? leg(data.destination, data.origin) : Promise.resolve(null)]);
      return { outbound, inbound, queriedAt: new Date().toISOString() };
    })();
    for (const [entryKey, entry] of cache) if (entry.expires <= Date.now()) cache.delete(entryKey);
    if (cache.size >= 100) { const first = cache.keys().next().value; if (first) cache.delete(first); }
    cache.set(key, { expires: Date.now() + 15 * 60 * 1000, result });
    try { return await result; } catch (error) { cache.delete(key); throw error; }
  });