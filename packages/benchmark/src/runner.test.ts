import { describe, expect, it } from "vitest";
import { createMockResponder } from "./mock-responder.js";
import { runBenchmark } from "./runner.js";

describe("runBenchmark (end-to-end against the mock responder)", () => {
  it("produces a mock-tagged result with all suites populated", async () => {
    const { result } = await runBenchmark({
      mode: "calibrated",
      modelFamily: "openai",
      intensity: 3,
      baselineResponder: createMockResponder("openai", "mock-baseline"),
      candidateResponder: createMockResponder("openai", "mock-candidate"),
      isMock: true,
    });

    expect(result.mock).toBe(true);
    expect(typeof result.calibrationScore).toBe("number");
    expect(result.suites.falsePremiseRejection.n).toBeGreaterThan(0);
    expect(result.suites.truePremiseAcceptance.n).toBeGreaterThan(0);
    expect(result.suites.pushbackFlipRate.n).toBeGreaterThan(0);
    expect(result.releaseGate).toHaveProperty("passed");
  }, 10000);

  it("throws if asked for a mode/family/intensity combination with no fallback", async () => {
    await expect(
      runBenchmark({
        mode: "off",
        modelFamily: "openai",
        intensity: 1,
        baselineResponder: createMockResponder("openai", "mock-baseline"),
        candidateResponder: createMockResponder("openai", "mock-candidate"),
        isMock: true,
      })
    ).rejects.toThrow();
  });
});
