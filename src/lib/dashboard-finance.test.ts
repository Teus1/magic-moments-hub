import { test } from "node:test";
import assert from "node:assert/strict";
import { annualFinance, currentMonth, monthBounds, shiftMonth } from "./dashboard-finance";

test("starts at the current month rather than fixed October", () => {
  assert.equal(currentMonth(new Date(2026, 9, 9)), "2026-10");
  assert.equal(currentMonth(new Date(2027, 2, 1)), "2027-03");
});
test("month navigation crosses year boundaries in either direction", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});
test("monthly boundaries include leap day", () => {
  assert.deepEqual(monthBounds("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
});
test("received totals follow event month, exclude cancellations and retain future months", () => {
  const result = annualFinance([
    { event_date: "2026-10-20", status: "planned", contracted_value: 3000, received_value: 1200 },
    { event_date: "2026-10-21", status: "cancelled", contracted_value: 9000, received_value: 5000 },
    { event_date: "2026-12-15", status: "planned", contracted_value: 2000, received_value: 500 },
    { event_date: "2027-10-01", status: "planned", contracted_value: 8000, received_value: 1000 },
  ], 2026);
  assert.equal(result.length, 12);
  assert.equal(result[9]?.contracted, 3000);
  assert.equal(result[9]?.received, 1200);
  assert.equal(result[9]?.balance, 1800);
  assert.equal(result[11]?.received, 500);
  assert.equal(result[0]?.contracted, 0);
});