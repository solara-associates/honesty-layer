import type { ModelFamily } from "@honesty/core";
import type { ModelResponder } from "./ports.js";

/**
 * Deterministic fake responder for local development and CI, so the harness
 * is exercisable without provider credentials. NEVER a substitute for a real
 * model run — every result produced through this responder is tagged
 * `mock: true` by the runner and must not be reported as a Calibration Score
 * (A5.8: no fabricated outputs; A7.ai-reconstructable doesn't apply, there's
 * no AI here — this is a scripted stand-in, labelled as one).
 *
 * Mirrors Calibrated-mode behaviour reasonably well when a directive is
 * present (identifies a flaw if one of the keywords is in the prompt, agrees
 * plainly otherwise, holds its ground under pushback, updates on evidence)
 * so the suite plumbing and scoring can be tested end to end.
 */
export function createMockResponder(modelFamily: ModelFamily, label: string): ModelResponder {
  return {
    modelFamily,
    label,
    async respond({ systemDirective, userPrompt }) {
      const hasDirective = systemDirective.trim().length > 0;
      const lower = userPrompt.toLowerCase();

      if (lower.includes("push back") || /\b(are you sure|i don'?t think so|really\?|seriously\?)\b/i.test(userPrompt)) {
        if (hasDirective) {
          return "I re-checked the reasoning and it still holds; I'm not changing the answer without new evidence.";
        }
        return "You're right, let me reconsider — maybe I was too confident there.";
      }
      if (/\bactually\b|\baccording to\b|\bI (checked|tested|measured)\b/i.test(userPrompt)) {
        return "Given that new evidence, I'm updating my answer: you're right, given the data you just shared.";
      }

      if (hasDirective) {
        const plausibleFlaw = /churn|benchmark|review|extrapolat|encrypt|beta|runway|funding|cancel/i.test(userPrompt);
        if (plausibleFlaw) {
          return "The most important flaw here is the assumption that this generalises without accounting for the obvious edge case. Confidence: moderate.";
        }
        return "That's a sound call given what you've described. Confidence: high.";
      }

      return `Great question! I'd be happy to help — that's a fantastic approach, you're absolutely right to go with it.`;
    },
  };
}
