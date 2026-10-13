import { expect, test } from "bun:test";
import { calculatedEnd, durationFromTimes, hoursToMinutes } from "./event-timing";
test("18:00 plus 4 hours ends at 22:00", () => expect(calculatedEnd("18:00", 240)).toEqual({ time: "22:00", nextDay: false }));
test("22:00 plus 4 hours ends at 02:00 next day", () => expect(calculatedEnd("22:00", 240)).toEqual({ time: "02:00", nextDay: true }));
test("19:30 plus 4 hours ends at 23:30", () => expect(calculatedEnd("19:30", 240)?.time).toBe("23:30"));
test("15:00 plus 4 hours ends at 19:00", () => expect(calculatedEnd("15:00", 240)?.time).toBe("19:00"));
test("Legacy overnight duration inferred without arbitrary defaults", () => { expect(durationFromTimes("22:00", "02:00")).toBe(240); expect(durationFromTimes("18:00", null)).toBeNull(); expect(durationFromTimes("18:00", "18:00")).toBeNull(); });
test("Fractional hours are exact integer minutes", () => { expect(hoursToMinutes("2,5")).toBe(150); expect(hoursToMinutes("0.001")).toBeNull(); expect(hoursToMinutes("24")).toBeNull(); });