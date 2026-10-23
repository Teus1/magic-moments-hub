import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesEventFilters } from "./event-list-filters";
const event = {
  event_date: "2026-12-31",
  service_id: "s1",
  client_id: "c1",
  contracted_value: 1000,
  received_value: 250,
};
const filters = {
  dateStart: "2026-12-31",
  dateEnd: "2027-01-01",
  service: "s1",
  client: "c1",
  finance: "pending" as const,
};
test("date boundaries combine with service and client", () => {
  assert.equal(matchesEventFilters(event, filters), true);
  assert.equal(matchesEventFilters(event, { ...filters, dateStart: "2027-01-01" }), false);
  assert.equal(matchesEventFilters(event, { ...filters, service: "s2" }), false);
  assert.equal(matchesEventFilters(event, { ...filters, client: "c2" }), false);
});
test("finance distinguishes outstanding from paid", () => {
  assert.equal(matchesEventFilters(event, { ...filters, finance: "paid" }), false);
  assert.equal(
    matchesEventFilters({ ...event, received_value: 1000 }, { ...filters, finance: "paid" }),
    true,
  );
});
