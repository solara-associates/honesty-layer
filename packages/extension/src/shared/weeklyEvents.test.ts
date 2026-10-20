import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWeeklyRecap, logWeeklyEvent } from "./weeklyEvents.js";

/** In-memory stand-in for chrome.storage.local, good enough to test read-prune-write logic. */
function stubChromeStorage() {
  let store: Record<string, unknown> = {};
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn((key: string) => Promise.resolve(key in store ? { [key]: store[key] } : {})),
        set: vi.fn((patch: Record<string, unknown>) => {
          store = { ...store, ...patch };
          return Promise.resolve();
        }),
      },
    },
  });
}

describe("weeklyEvents (fixes fragility #5: computeWeeklyRecap previously had no producer)", () => {
  beforeEach(() => stubChromeStorage());
  afterEach(() => vi.unstubAllGlobals());

  it("has an empty recap before any event is logged", async () => {
    const { recap } = await getWeeklyRecap();
    expect(recap.totalResponses).toBe(0);
  });

  it("aggregates logged events into a real recap", async () => {
    await logWeeklyEvent({ flagged: true, modelBackedDownOnPushback: false, modeUsed: "calibrated" });
    await logWeeklyEvent({ flagged: false, modelBackedDownOnPushback: true, modeUsed: "calibrated" });
    await logWeeklyEvent({ flagged: false, modelBackedDownOnPushback: false, modeUsed: "redteam" });

    const { recap, shareText } = await getWeeklyRecap();
    expect(recap.totalResponses).toBe(3);
    expect(recap.flaggedShare).toBeCloseTo(1 / 3);
    expect(recap.modeUsageCounts).toEqual({ calibrated: 2, redteam: 1 });
    expect(shareText).toMatch(/\d+% of the time/);
  });

  it("prunes events older than the 7-day window", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      await logWeeklyEvent({ flagged: true, modelBackedDownOnPushback: false, modeUsed: "calibrated" });

      vi.setSystemTime(new Date("2026-01-10T00:00:00Z")); // 9 days later, outside the window
      const { recap } = await getWeeklyRecap();
      expect(recap.totalResponses).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
