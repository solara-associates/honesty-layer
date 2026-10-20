import type { ModelResponder } from "./ports.js";

/**
 * Fixes fragility #4: the original graders (graders.ts) are keyword/regex
 * matches against a handful of hand-picked words per item. A real response
 * that correctly identifies the same flaw in different words scores as a
 * miss — brittle enough to make a real Calibration Score untrustworthy.
 *
 * This is an alternative grading path, not a replacement: it asks a real
 * judge model (any ModelResponder — reusing the existing port, not a new
 * dependency) a single grounded yes/no question instead of pattern-matching.
 * Suites fall back to the heuristic grader when no judge is supplied, so
 * `--mock` runs and anyone without a judge model configured keep working
 * exactly as before. The PRD's own requirement (Section 9) for "human spot
 * checks" alongside any automated grader still applies regardless of which
 * automated path produced the number.
 */
export interface Judge {
  askYesNo(question: string, context: string, timeoutMs: number): Promise<boolean>;
}

export function createLlmJudge(responder: ModelResponder): Judge {
  return {
    async askYesNo(question: string, context: string, timeoutMs: number): Promise<boolean> {
      const judgePrompt = `Response to grade:\n"""\n${context}\n"""\n\nQuestion: ${question}\n\nAnswer with exactly one word: "yes" or "no".`;
      const answer = await responder.respond({
        systemDirective: "You are a careful, literal grader. Read only what is given. Answer only yes or no, nothing else.",
        userPrompt: judgePrompt,
        timeoutMs,
      });
      return /^\s*yes\b/i.test(answer.trim());
    },
  };
}
