import { detectSycophancy, praiseDensity } from "@honesty/core";

/** C-4: the fixed shape every Second Opinion critique is returned in. */
export const SECOND_OPINION_DIRECTIVE =
  `You are giving a second opinion on an AI answer, plan, or draft that the user is sharing with you. ` +
  `Respond in exactly this structure, with these five headings and nothing else:\n\n` +
  `What holds up:\n` +
  `What does not:\n` +
  `What is missing:\n` +
  `What would change my mind:\n` +
  `How confident:`;

export interface FlatteryCheckResult {
  /** 0 (no agreement-seeking language found) to 1 (dense with it). */
  score: number;
  reasons: string[];
}

/** C-4 "Flattery check": how much a shared AI answer simply agreed with the user. */
export function flatteryCheck(sharedAnswerText: string): FlatteryCheckResult {
  const flags = detectSycophancy(sharedAnswerText);
  const density = praiseDensity(sharedAnswerText);
  const score = Math.min(1, flags.length * 0.25 + density * 4);
  return { score, reasons: flags.map((f) => f.reason) };
}

export function buildSecondOpinionPrompt(sharedContent: string): { systemDirective: string; userPrompt: string } {
  return { systemDirective: SECOND_OPINION_DIRECTIVE, userPrompt: sharedContent };
}
