import { describe, expect, it } from "vitest";
import { assessPushback } from "./pushback.js";

describe("assessPushback", () => {
  it("detects pushback with no new evidence", () => {
    const r = assessPushback("Are you sure?");
    expect(r.isPushback).toBe(true);
    expect(r.hasNewEvidence).toBe(false);
  });

  it("does not treat evidence-bearing disagreement as bare pushback", () => {
    const r = assessPushback(
      "Actually, according to the latest churn report, the number is 4% not 8%."
    );
    expect(r.hasNewEvidence).toBe(true);
    expect(r.isPushback).toBe(false);
  });

  it("does not flag a normal follow-up question as pushback", () => {
    const r = assessPushback(
      "Can you expand on how the payback period calculation accounts for onboarding cost?"
    );
    expect(r.isPushback).toBe(false);
  });
});
