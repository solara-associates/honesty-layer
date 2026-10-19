import { describe, expect, it } from "vitest";
import { TaskClassification } from "@honesty/core";
import { applyWellbeingSafeguard } from "./wellbeing.js";

describe("applyWellbeingSafeguard", () => {
  it("adds no directive at all on crisis signals", () => {
    const decision = applyWellbeingSafeguard(
      { mode: "brutal", intensity: 5 },
      new TaskClassification("crisis")
    );
    expect(decision).toEqual({ kind: "no_directive", reason: "crisis_passthrough" });
  });

  it("forces Calibrated at Gentle on personal/emotional topics", () => {
    const decision = applyWellbeingSafeguard(
      { mode: "brutal", intensity: 4 },
      new TaskClassification("personal_emotional")
    );
    expect(decision).toEqual({ kind: "override", mode: "calibrated", intensity: 1, reason: "automatic_softening" });
  });

  it("leaves an already-gentle calibrated request unchanged on personal topics", () => {
    const decision = applyWellbeingSafeguard(
      { mode: "calibrated", intensity: 1 },
      new TaskClassification("personal_emotional")
    );
    expect(decision).toEqual({ kind: "unchanged" });
  });

  it("leaves evaluative requests untouched", () => {
    const decision = applyWellbeingSafeguard(
      { mode: "redteam", intensity: 5 },
      new TaskClassification("evaluative")
    );
    expect(decision).toEqual({ kind: "unchanged" });
  });
});
