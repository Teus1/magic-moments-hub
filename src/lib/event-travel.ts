import { calculateTravelCost } from "@/lib/travel";

export function eventDestination(ev: {
  address: string | null;
  venue: string | null;
  venue_city: string | null;
  venue_state: string | null;
}) {
  const value =
    ev.address?.trim() ||
    [ev.venue, ev.venue_city, ev.venue_state]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(", ");
  return value.length >= 5 ? value : "";
}

/** Total do deslocamento ida e volta; o pedágio manual sempre prevalece sobre o do Google. */
export function eventTravelTotal(
  distanceKm: number,
  efficiency: number,
  fuelPrice: number,
  toll: number | null,
  manualToll: number | null,
) {
  const usedToll = manualToll ?? toll;
  if (usedToll === null) return null;
  return calculateTravelCost(distanceKm, efficiency, fuelPrice, usedToll);
}

/** A estimativa fica desatualizada se o endereço da empresa ou do evento mudou. */
export function isEstimateStale(
  est: { origin: string; destination: string } | undefined,
  origin: string,
  destination: string,
) {
  return !est || est.origin !== origin.trim() || est.destination !== destination;
}
