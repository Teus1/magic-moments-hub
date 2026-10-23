import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatedEnd, durationFromTimes, hoursToMinutes } from "./event-timing";
test("18:00 plus 4 hours ends at 22:00", () =>
  assert.deepEqual(calculatedEnd("18:00", 240), { time: "22:00", nextDay: false }));
test("22:00 plus 4 hours ends at 02:00 next day", () =>
  assert.deepEqual(calculatedEnd("22:00", 240), { time: "02:00", nextDay: true }));
test("19:30 plus 4 hours ends at 23:30", () =>
  assert.equal(calculatedEnd("19:30", 240)?.time, "23:30"));
test("15:00 plus 4 hours ends at 19:00", () =>
  assert.equal(calculatedEnd("15:00", 240)?.time, "19:00"));
test("Legacy overnight duration inferred without arbitrary defaults", () => {
  assert.equal(durationFromTimes("22:00", "02:00"), 240);
  assert.equal(durationFromTimes("18:00", null), null);
  assert.equal(durationFromTimes("18:00", "18:00"), null);
});
test("Fractional hours are exact integer minutes", () => {
  assert.equal(hoursToMinutes("2,5"), 150);
  assert.equal(hoursToMinutes("0.001"), null);
  assert.equal(hoursToMinutes("24"), null);
});
