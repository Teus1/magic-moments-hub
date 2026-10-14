export interface EventListFilters { dateStart: string; dateEnd: string; service: string; client: string; finance: "all" | "pending" | "paid" }
export function matchesEventFilters(event: { event_date: string; service_id: string | null; client_id: string; contracted_value: number; received_value: number }, filters: EventListFilters) {
  if (filters.dateStart && event.event_date < filters.dateStart) return false;
  if (filters.dateEnd && event.event_date > filters.dateEnd) return false;
  if (filters.service !== "all" && event.service_id !== filters.service) return false;
  if (filters.client !== "all" && event.client_id !== filters.client) return false;
  const balance = Number(event.contracted_value ?? 0) - Number(event.received_value ?? 0);
  if (filters.finance === "pending" && balance <= 0) return false;
  if (filters.finance === "paid" && balance > 0) return false;
  return true;
}
