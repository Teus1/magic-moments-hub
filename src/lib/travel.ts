export interface TravelLeg {
  distanceKm: number;
  durationSeconds: number;
  polyline: string;
  toll: number | null;
}

export interface TravelRoute {
  outbound: TravelLeg;
  inbound: TravelLeg | null;
  queriedAt: string;
}

export function calculateTravelCost(distanceKm: number, efficiency: number, fuelPrice: number, toll: number) {
  if (![distanceKm, efficiency, fuelPrice, toll].every(Number.isFinite) || distanceKm < 0 || efficiency <= 0 || fuelPrice < 0 || toll < 0) {
    return null;
  }
  const liters = distanceKm / efficiency;
  const fuel = liters * fuelPrice;
  return { liters, fuel, toll, total: fuel + toll };
}

export function parseTravelLeg(value: unknown): TravelLeg {
  const route = value as { distanceMeters?: number; duration?: string; polyline?: { encodedPolyline?: string }; travelAdvisory?: { tollInfo?: { estimatedPrice?: Array<{ currencyCode?: string; units?: string; nanos?: number }> } } } | undefined;
  const duration = route?.duration?.match(/^(\d+(?:\.\d+)?)s$/);
  if (!route || !duration || !route.polyline?.encodedPolyline) throw new Error("O Google Maps não retornou um trajeto completo.");
  const distanceMeters = route.distanceMeters ?? 0;
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) throw new Error("Distância inválida retornada pelo Google Maps.");
  const tollInfo = route.travelAdvisory?.tollInfo;
  const prices = tollInfo?.estimatedPrice;
  let toll: number | null = tollInfo ? null : 0;
  if (prices?.length && prices.every((price) => price.currencyCode === "BRL")) {
    const amounts = prices.map((price) => Number(price.units ?? 0) + (price.nanos ?? 0) / 1e9);
    if (amounts.every((amount) => Number.isFinite(amount) && amount >= 0)) toll = amounts.reduce((sum, amount) => sum + amount, 0);
  }
  return { distanceKm: distanceMeters / 1000, durationSeconds: Number(duration[1]), polyline: route.polyline.encodedPolyline, toll };
}