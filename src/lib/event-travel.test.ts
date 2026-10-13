import { describe, expect, it } from "vitest";
import { eventTravelTotal, isEstimateStale } from "./event-travel";

describe("event travel", () => {
  it("soma combustível ida e volta e pedágio", () => {
    expect(eventTravelTotal(200, 10, 6, 30, null)?.total).toBe(150);
  });
  it("pedágio manual prevalece", () => {
    expect(eventTravelTotal(200, 10, 6, 30, 50)?.total).toBe(170);
  });
  it("sem pedágio conhecido não há total", () => {
    expect(eventTravelTotal(200, 10, 6, null, null)).toBeNull();
  });
  it("recalcula quando o endereço muda", () => {
    expect(isEstimateStale({ origin: "A rua", destination: "B" }, "A rua", "C")).toBe(true);
    expect(isEstimateStale({ origin: "A rua", destination: "B" }, "A rua", "B")).toBe(false);
  });
});
