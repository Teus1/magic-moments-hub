import { test } from "node:test";
import assert from "node:assert/strict";
import { eventTravelTotal, isEstimateStale } from "./event-travel";

test("soma combustível ida e volta e pedágio", () => {
  assert.equal(eventTravelTotal(200, 10, 6, 30, null)?.total, 150);
});
test("pedágio manual prevalece", () => {
  assert.equal(eventTravelTotal(200, 10, 6, 30, 50)?.total, 170);
});
test("sem pedágio conhecido não há total", () => {
  assert.equal(eventTravelTotal(200, 10, 6, null, null), null);
});
test("recalcula quando o endereço muda", () => {
  assert.equal(isEstimateStale({ origin: "A rua", destination: "B" }, "A rua", "C"), true);
  assert.equal(isEstimateStale({ origin: "A rua", destination: "B" }, "A rua", "B"), false);
});
