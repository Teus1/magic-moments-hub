import { parseTravelLeg, type TravelLeg } from "@/lib/travel";

export async function fetchTravelLeg(
  origin: string,
  destination: string,
  avoidTolls = false,
): Promise<TravelLeg> {
  const apiKey = process.env["GOOGLE_MAPS_API_KEY_1"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || !lovableKey) throw new Error("Conecte o Google Maps para consultar trajetos.");
  const response = await fetch(
    "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
    {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo",
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        languageCode: "pt-BR",
        regionCode: "BR",
        units: "METRIC",
        extraComputations: ["TOLLS"],
        routeModifiers: { avoidTolls, vehicleInfo: { emissionType: "GASOLINE" } },
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    console.error(`Google Maps [${response.status}]: ${body}`);
    throw new Error(`Google Maps [${response.status}]: não foi possível calcular o trajeto.`);
  }
  const payload = (await response.json()) as { routes?: unknown[] };
  if (!payload.routes?.length) throw new Error("Nenhum trajeto encontrado. Confira os endereços.");
  return parseTravelLeg(payload.routes[0]);
}
