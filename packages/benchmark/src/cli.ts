#!/usr/bin/env node
import { isModelFamily, isMode, parseIntensity } from "@honesty/core";
import { createMockResponder } from "./mock-responder.js";
import { runBenchmark } from "./runner.js";

function arg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

async function main() {
  const modeArg = arg("mode", "calibrated");
  const familyArg = arg("family", "openai");
  const intensityArg = Number(arg("intensity", "3"));
  const mock = process.argv.includes("--mock");

  if (!isMode(modeArg)) throw new Error(`Unknown mode: ${modeArg}`);
  if (!isModelFamily(familyArg)) throw new Error(`Unknown model family: ${familyArg}`);
  const intensity = parseIntensity(intensityArg);

  if (!mock) {
    console.error(
      "No real ModelResponder is wired up yet. Pass --mock to run the harness against the " +
        "deterministic stand-in responder, or implement a ModelResponder for your provider " +
        "(see src/ports.ts) and call runBenchmark() directly instead of this CLI."
    );
    process.exitCode = 2;
    return;
  }

  console.log("MOCK RUN — not a real model evaluation. Results are tagged mock:true and must not be reported as a Calibration Score.");

  const { result, path } = await runBenchmark({
    mode: modeArg,
    modelFamily: familyArg,
    intensity,
    baselineResponder: createMockResponder(familyArg, "mock-baseline"),
    candidateResponder: createMockResponder(familyArg, "mock-candidate"),
    isMock: true,
  });

  console.log(JSON.stringify({ calibrationScore: result.calibrationScore, releaseGate: result.releaseGate }, null, 2));
  console.log(`Full result written to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
