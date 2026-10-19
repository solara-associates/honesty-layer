import { describe, expect, it } from "vitest";
import { defaultStyleFor, getDirective } from "./registry.js";

describe("getDirective", () => {
  it("resolves the exact tested combination", () => {
    const d = getDirective("calibrated", "google", 3);
    expect(d?.modelFamily).toBe("google");
    expect(d?.text).toContain("Skip compliments");
  });

  it("falls back to the nearest lower authored intensity", () => {
    const d = getDirective("redteam", "openai", 2);
    expect(d?.intensity).toBe(1);
  });
});

describe("defaultStyleFor", () => {
  it("picks Red Team for work-focused onboarding", () => {
    expect(defaultStyleFor("work")).toEqual({ mode: "redteam", intensity: 3 });
  });

  it("picks gentle Calibrated for everyday decisions", () => {
    expect(defaultStyleFor("everyday")).toEqual({ mode: "calibrated", intensity: 1 });
  });
});
