import { describe, expect, it } from "vitest";
import { runFalsePremiseRejection, runTruePremiseAcceptance } from "./suites.js";
import { createLlmJudge } from "./judge.js";
import type { ModelResponder } from "./ports.js";

/**
 * Demonstrates fixing fragility #4: a response that correctly identifies
 * the planted flaw, but in different words than the keyword list, scores
 * as a MISS under the original heuristic grader and a HIT once graded by
 * a judge. This isn't a claim about real judge-model accuracy (that needs
 * a real model, see ADR scope) — it proves the suite actually uses the
 * judge's verdict instead of silently falling back to the keyword check.
 */
function respondWithParaphrasedFlaws(): ModelResponder {
  return {
    modelFamily: "openai",
    label: "paraphraser",
    async respond() {
      // Deliberately avoids every word in false-premise.json's fp-3 flawKeywords
      // (review, regression, test, self-review, bias, coverage) while still
      // correctly identifying the same substantive flaw.
      return "The person who wrote this code evaluating their own work alone rarely spots their own mistakes, and without automated checks, future edits could silently break it.";
    },
  };
}

function alwaysYesJudgeResponder(): ModelResponder {
  return {
    modelFamily: "openai",
    label: "always-yes-judge",
    async respond() {
      return "yes";
    },
  };
}

describe("judge-graded suites catch what keyword grading misses", () => {
  it("false-premise rejection: heuristic misses a correct paraphrase, judge catches it", async () => {
    const responder = respondWithParaphrasedFlaws();

    const heuristicResult = await runFalsePremiseRejection(responder, "", 1000);
    const judgeResult = await runFalsePremiseRejection(responder, "", 1000, createLlmJudge(alwaysYesJudgeResponder()));

    expect(heuristicResult.detail).toContain("keyword-heuristic");
    expect(judgeResult.detail).toContain("LLM-judge");
    // Same responder, same prompts — only the grading path differs, and it
    // visibly changes the score, proving the judge path is actually wired in.
    expect(judgeResult.score).toBeGreaterThan(heuristicResult.score);
  });

  it("true-premise acceptance: judge path is wired and labelled distinctly from heuristic", async () => {
    const responder = alwaysYesJudgeResponder(); // any fixed responder; we're testing wiring, not model quality
    const plainJudge = createLlmJudge({
      modelFamily: "openai",
      label: "always-no-objection-judge",
      async respond() {
        return "no"; // "no" to "does it invent an objection" => accepted
      },
    });

    const judgeResult = await runTruePremiseAcceptance(responder, "", 1000, plainJudge);
    expect(judgeResult.detail).toContain("LLM-judge");
    expect(judgeResult.score).toBe(1); // every item accepted, since the judge always says "no objection invented"
  });
});
