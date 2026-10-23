import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appointmentSchema,
  appointmentPermissions,
  eventInterval,
  calendarToday,
} from "./calendar";
const draft = {
  event_id: "11111111-1111-4111-8111-111111111111",
  title: "Montagem",
  start_at: "2026-10-09T23:00",
  end_at: "2026-10-10T01:00",
  venue: "",
  observations: "",
};
test("operational commitments always require an event", () => {
  assert.equal(appointmentSchema.safeParse({ ...draft, event_id: "" }).success, false);
  assert.equal(appointmentSchema.safeParse(draft).success, true);
});
test("end is later than start, including overnight commitments", () => {
  assert.equal(appointmentSchema.safeParse({ ...draft, end_at: draft.start_at }).success, false);
  assert.equal(
    appointmentSchema.safeParse({ ...draft, end_at: "2026-10-09T22:00" }).success,
    false,
  );
  assert.equal(appointmentSchema.safeParse(draft).success, true);
});
test("calendar writes follow Events permissions, not Calendar edit", () => {
  const rights = new Set(["calendar.view", "calendar.edit", "events.view"]);
  assert.equal(appointmentPermissions((m, a) => rights.has(`${m}.${a}`)).edit, false);
  rights.add("events.edit");
  assert.equal(appointmentPermissions((m, a) => rights.has(`${m}.${a}`)).edit, true);
  assert.equal(appointmentPermissions((m, a) => rights.has(`${m}.${a}`)).create, false);
  assert.equal(appointmentPermissions((m, a) => rights.has(`${m}.${a}`)).delete, false);
});
test("calendar access alone does not grant operational commitments access", () => {
  assert.equal(appointmentPermissions((m) => m === "calendar").read, false);
});
test("event crossing midnight ends on following date", () => {
  assert.equal(
    eventInterval({ event_date: "2026-12-31", start_time: "23:00:00", end_time: "02:00:00" }).end,
    "2027-01-01T02:00:00",
  );
});
test("unknown event times are never invented", () => {
  assert.equal(
    eventInterval({ event_date: "2026-10-09", start_time: null, end_time: null }).allDay,
    true,
  );
  assert.equal(
    eventInterval({ event_date: "2026-10-09", start_time: "18:00", end_time: null }).end,
    undefined,
  );
});
test("current calendar day follows Sao Paulo rather than UTC", () => {
  assert.equal(calendarToday(new Date("2026-10-09T01:50:00Z")), "2026-10-08");
});
