import { describe, expect, it } from "vitest";
import { detectSycophancy, praiseDensity } from "./detector.js";

describe("detectSycophancy", () => {
  it("flags a performative opener", () => {
    const flags = detectSycophancy("Great question! Here's the answer...");
    expect(flags.some((f) => f.kind === "praise_opener")).toBe(true);
  });

  it("flags empty validation", () => {
    const flags = detectSycophancy("You're absolutely right, that's a great plan.");
    expect(flags.some((f) => f.kind === "empty_validation")).toBe(true);
  });

  it("flags a hedged non-answer", () => {
    const flags = detectSycophancy("Honestly, it really depends");
    expect(flags.some((f) => f.kind === "hedged_non_answer")).toBe(true);
  });

  it("does not flag a direct, substantive answer", () => {
    const flags = detectSycophancy(
      "The flaw is that your CAC estimate ignores churn. At 8% monthly churn, payback exceeds 14 months."
    );
    expect(flags).toHaveLength(0);
  });
});

describe("praiseDensity", () => {
  it("is zero for text with no praise words", () => {
    expect(praiseDensity("The test suite failed on three assertions.")).toBe(0);
  });

  it("is positive for praise-heavy text", () => {
    expect(praiseDensity("This is great, amazing, brilliant work.")).toBeGreaterThan(0);
  });
});
