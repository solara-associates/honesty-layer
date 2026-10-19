import { describe, expect, it } from "vitest";
import { computeWeeklyRecap, recapShareText, type WeeklyEvent } from "./flatteryMeter.js";

describe("computeWeeklyRecap", () => {
  it("aggregates flagged and backed-down shares", () => {
    const events: WeeklyEvent[] = [
      { flagged: true, modelBackedDownOnPushback: false, modeUsed: "calibrated" },
      { flagged: false, modelBackedDownOnPushback: true, modeUsed: "calibrated" },
      { flagged: false, modelBackedDownOnPushback: false, modeUsed: "redteam" },
      { flagged: false, modelBackedDownOnPushback: false, modeUsed: "calibrated" },
    ];
    const recap = computeWeeklyRecap(events);
    expect(recap.totalResponses).toBe(4);
    expect(recap.flaggedShare).toBe(0.25);
    expect(recap.backedDownShare).toBe(0.25);
    expect(recap.modeUsageCounts).toEqual({ calibrated: 3, redteam: 1 });
  });

  it("handles an empty week without dividing by zero", () => {
    const recap = computeWeeklyRecap([]);
    expect(recap.totalResponses).toBe(0);
    expect(recap.flaggedShare).toBe(0);
  });
});

describe("recapShareText", () => {
  it("renders the agreed-share headline", () => {
    const text = recapShareText({ totalResponses: 10, flaggedShare: 0.22, backedDownShare: 0, modeUsageCounts: {} });
    expect(text).toContain("78%");
  });
});
