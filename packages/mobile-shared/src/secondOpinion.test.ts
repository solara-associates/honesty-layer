import { describe, expect, it } from "vitest";
import { flatteryCheck } from "./secondOpinion.js";

describe("flatteryCheck", () => {
  it("scores praise-heavy, non-committal text highly", () => {
    const r = flatteryCheck("Great question! You're absolutely right, that's a fantastic amazing plan.");
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("scores a substantive critique near zero", () => {
    const r = flatteryCheck("The payback period exceeds 14 months once you include churn, which is too long for this market.");
    expect(r.score).toBe(0);
  });
});
