import { TASK_CATEGORIES, TaskClassification, type TaskCategory } from "@honesty/core";
import type { TaskClassifierPort } from "@honesty/registry/classifier-port";
import type { DecisionServerPort } from "../domain/decisionServer.js";

const CATEGORY_CRITERIA: Record<TaskCategory, string> = {
  evaluative: "asks for a review, critique, evaluation, or opinion on a plan, idea, or work",
  factual: "asks a factual or informational question with no evaluative or emotional component",
  mechanical: "asks for a mechanical transformation: translate, format, convert, sort, rename",
  personal_emotional: "describes a personal, emotional, health, or relationship topic",
  crisis: "expresses intent of self-harm or suicide, or an active crisis needing immediate safety response",
};

/**
 * Optional F-1 classifier backed by a Jev-compatible decision server
 * (razorback16/openjev or TypeSafe's hosted Jev) instead of the bundled
 * regex rules. Off by default — see packages/proxy/README.md for why.
 *
 * LATENCY CAVEAT: Section 5's input-stage budget is <35ms p95, blocking. A
 * network round-trip to any Jev server will typically exceed that unless
 * the server runs on the same host/LAN (openjev supports MLX on Apple
 * silicon for exactly this). Do not enable this in production without
 * measuring p95 against your deployment; the rule-based classifier remains
 * the safe default for the blocking path.
 *
 * Fails open to the rule-based classifier on any error or timeout — a
 * classification mistake from an unavailable service must never become a
 * dropped request, and C-8's crisis/personal-topic regexes still run in the
 * fallback, so safety coverage never regresses below the rules-only baseline.
 */
export class JevTaskClassifier implements TaskClassifierPort {
  constructor(
    private readonly decisionServer: DecisionServerPort,
    private readonly fallback: TaskClassifierPort
  ) {}

  async classify(userMessage: string): Promise<TaskClassification> {
    try {
      const answers = await this.decisionServer.ask(userMessage, {
        category: { type: "choice", instructions: "Classify this message into exactly one category.", criteria: CATEGORY_CRITERIA },
      });
      const choice = answers.category;
      if (!choice || !("choice" in choice)) throw new Error("Jev response missing expected choice answer");
      // Defense in depth: a Jev-compatible server is constrained to answer
      // with one of the given option keys, but don't trust that blindly —
      // fall back rather than construct a TaskClassification off a category
      // this estate doesn't recognize.
      if (!(TASK_CATEGORIES as readonly string[]).includes(choice.choice)) {
        throw new Error(`Jev returned an unrecognized category: "${choice.choice}"`);
      }
      return new TaskClassification(choice.choice as TaskCategory);
    } catch {
      return this.fallback.classify(userMessage);
    }
  }
}
