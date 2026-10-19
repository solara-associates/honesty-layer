import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Intensity, Mode, ModelFamily } from "@honesty/core";
import { DirectiveRegistry } from "@honesty/registry";
import { withTimeout, type ModelResponder } from "./ports.js";
import {
  runEvidenceBasedUpdateRate,
  runFalsePremiseRejection,
  runFeedbackCalibration,
  runPushbackFlipRate,
  runTaskQuality,
  runTone,
  runTruePremiseAcceptance,
} from "./suites.js";
import { checkReleaseGates, computeCalibrationScore } from "./score.js";

// A5.10 — durable state, declared: benchmark runs append one JSON file per
// run under results/. Append-only, no update-in-place, no database — the
// declared store for this package.
const RESULTS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "results");

export interface RunParams {
  mode: Mode;
  modelFamily: ModelFamily;
  intensity: Intensity;
  baselineResponder: ModelResponder;
  candidateResponder: ModelResponder;
  timeoutMs?: number;
  isMock: boolean;
}

export async function runBenchmark(params: RunParams) {
  const { timeoutMs = 4000 } = params;
  const registry = new DirectiveRegistry();
  const { directive } = registry.get(params.mode, params.modelFamily, params.intensity);

  const baseline = withTimeout(params.baselineResponder, timeoutMs);
  const candidate = withTimeout(params.candidateResponder, timeoutMs);

  const [
    baselineTrue,
    candidateFalse,
    candidateTrue,
    candidatePushback,
    candidateEvidence,
    candidateFeedback,
    candidateTone,
    candidateTaskQuality,
    baselineTaskQuality,
  ] = await Promise.all([
    runTruePremiseAcceptance(baseline, "", timeoutMs),
    runFalsePremiseRejection(candidate, directive.text, timeoutMs),
    runTruePremiseAcceptance(candidate, directive.text, timeoutMs),
    runPushbackFlipRate(candidate, directive.text, timeoutMs),
    runEvidenceBasedUpdateRate(candidate, directive.text, timeoutMs),
    runFeedbackCalibration(candidate, directive.text, timeoutMs),
    runTone(candidate, directive.text, timeoutMs),
    runTaskQuality(candidate, directive.text, timeoutMs),
    runTaskQuality(baseline, "", timeoutMs),
  ]);

  const calibrationScore = computeCalibrationScore({
    falsePremiseRejection: candidateFalse,
    truePremiseAcceptance: candidateTrue,
    pushbackFlipRate: candidatePushback,
  });

  const gate = checkReleaseGates({
    baselineTruePremiseAcceptance: baselineTrue.score,
    candidateTruePremiseAcceptance: candidateTrue.score,
    candidateTone,
    candidateTaskQuality,
    baselineTaskQuality: baselineTaskQuality.score,
  });

  const result = {
    runAt: new Date().toISOString(),
    mock: params.isMock,
    directive: { id: directive.id, version: directive.version, appliedId: directive.appliedId },
    mode: params.mode,
    modelFamily: params.modelFamily,
    intensity: params.intensity,
    calibrationScore,
    releaseGate: gate,
    suites: {
      falsePremiseRejection: candidateFalse,
      truePremiseAcceptance: candidateTrue,
      baselineTruePremiseAcceptance: baselineTrue,
      pushbackFlipRate: candidatePushback,
      evidenceBasedUpdateRate: candidateEvidence,
      feedbackCalibration: candidateFeedback,
      tone: candidateTone,
      taskQuality: candidateTaskQuality,
      baselineTaskQuality,
    },
  };

  mkdirSync(RESULTS_ROOT, { recursive: true });
  const filename = `${result.runAt.replace(/[:.]/g, "-")}_${params.mode}_${params.modelFamily}_i${params.intensity}${params.isMock ? "_mock" : ""}.json`;
  writeFileSync(join(RESULTS_ROOT, filename), JSON.stringify(result, null, 2));

  return { result, path: join(RESULTS_ROOT, filename) };
}
