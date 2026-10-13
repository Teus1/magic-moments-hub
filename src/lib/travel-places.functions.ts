import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";

const gateway = "https://connector-gateway.lovable.dev/google_maps/places/v1";
export type TravelPlaceSuggestion = { placeId: string; text: string };
export type TravelPlace = { address: string; name: string; city: string; state: string; latitude: number | null; longitude: number | null; placeId: string };
const suggestionsCache = new Map<string, { expires: number; result: Promise<TravelPlaceSuggestion[]> }>();

async function requestPlaces(credentials: { apiKey: string; lovableKey: string }, path: string, mask: string, body?: unknown) {
  const { apiKey, lovableKey } = credentials;
  const response = await fetch(`${gateway}/${path}`, {
    method: body ? "POST" : "GET",
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": mask,
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!response.ok) {
    const text = await response.text();
    console.error(`Google Places [${response.status}]: ${text}`);
    if (response.status === 403) {
      let reason: string | undefined;
      try { reason = JSON.parse(text)?.error?.details?.find((item: { reason?: string }) => item.reason)?.reason; } catch { /* Keep provider error. */ }
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error(`Google Maps [403]: configure a chave de servidor sem restrição de site ou com restrição por IP. ${text}`);
      if (reason === "API_KEY_SERVICE_BLOCKED") throw new Error(`Google Maps [403]: habilite Places API (New) e permita seu uso na chave de servidor. ${text}`);
    }
    throw new Error(`Google Maps [${response.status}]: ${text}`);
  }
  return response.json();
}

export const getTravelPlaceSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ input: z.string().trim().min(3).max(300), sessionToken: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<TravelPlaceSuggestion[]> => {
    await assertCan(context.supabase, "events", "view");
    const apiKey = process.env['GOOGLE_MAPS_API_KEY_1'];
    const lovableKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey || !lovableKey) throw new Error("Conecte o Google Maps para buscar locais.");
    const key = JSON.stringify(data);
    const saved = suggestionsCache.get(key);
    if (saved && saved.expires > Date.now()) return saved.result;
    for (const [entryKey, entry] of suggestionsCache) if (entry.expires <= Date.now()) suggestionsCache.delete(entryKey);
    if (suggestionsCache.size >= 200) {
      const oldest = suggestionsCache.keys().next().value;
      if (oldest) suggestionsCache.delete(oldest);
    }
    const result = (async () => {
      const payload = await requestPlaces({ apiKey, lovableKey }, "places:autocomplete", "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text", {
        input: data.input, sessionToken: data.sessionToken, languageCode: "pt-BR", regionCode: "BR",
        locationBias: { rectangle: { low: { latitude: -33.75, longitude: -73.99 }, high: { latitude: 5.28, longitude: -34.79 } } },
      }) as { suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[] };
      return (payload.suggestions ?? []).flatMap(({ placePrediction: place }) => place?.placeId && place.text?.text ? [{ placeId: place.placeId, text: place.text.text }] : []).slice(0, 5);
    })();
    suggestionsCache.set(key, { expires: Date.now() + 60000, result });
    try { return await result; } catch (error) { suggestionsCache.delete(key); throw error; }
  });

export const resolveTravelPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().min(1).max(300).regex(/^[a-zA-Z0-9_-]+$/), sessionToken: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<TravelPlace> => {
    await assertCan(context.supabase, "events", "view");
    const apiKey = process.env['GOOGLE_MAPS_API_KEY_1'];
    const lovableKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey || !lovableKey) throw new Error("Conecte o Google Maps para buscar locais.");
    const place = await requestPlaces({ apiKey, lovableKey }, `places/${encodeURIComponent(data.placeId)}?sessionToken=${encodeURIComponent(data.sessionToken)}&languageCode=pt-BR`, "id,displayName,formattedAddress,addressComponents,location") as { id?: string; displayName?: { text?: string }; formattedAddress?: string; addressComponents?: { longText: string; shortText: string; types: string[] }[]; location?: { latitude?: number; longitude?: number } };
    if (!place.formattedAddress) throw new Error("Este local não possui endereço disponível.");
    const component = (type: string) => place.addressComponents?.find(item => item.types.includes(type));
    return { address: place.formattedAddress, name: place.displayName?.text ?? "", city: component("administrative_area_level_2")?.longText ?? component("locality")?.longText ?? "", state: component("administrative_area_level_1")?.shortText ?? "", latitude: place.location?.latitude ?? null, longitude: place.location?.longitude ?? null, placeId: place.id ?? data.placeId };
  });