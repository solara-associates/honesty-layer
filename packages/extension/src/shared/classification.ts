import { RuleBasedTaskClassifier } from "@honesty/registry/classifier";
import { applyWellbeingSafeguard } from "@honesty/registry/wellbeing";
import type { Intensity, Mode } from "@honesty/core";

const classifier = new RuleBasedTaskClassifier();

/** F-1 input-stage classification + C-8 wellbeing safeguard, reused from @honesty/registry (not duplicated). */
export async function classifyAndSafeguard(userMessage: string, mode: Mode, intensity: Intensity) {
  const classification = await classifier.classify(userMessage);
  const decision = applyWellbeingSafeguard({ mode, intensity }, classification);
  return { classification, decision };
}
