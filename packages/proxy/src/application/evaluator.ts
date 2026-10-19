import type { DecisionServerPort, JevAnswer, JevNoulAnswer } from "../domain/decisionServer.js";

/**
 * F-7 Truth / Logic Evaluator: "Optional second-model pass that critiques a
 * response for unsupported claims, logical gaps, missing counter-arguments
 * and sycophantic framing... never blocks the main response." Backed by a
 * Jev-compatible decision server (noul/choice/score primitives), which is a
 * better fit than a freeform second LLM call: typed, calibrated-confidence
 * answers instead of text this service would have to parse.
 */
export interface EvaluatorVerdict {
  hasUnsupportedClaims: boolean;
  hasLogicalGaps: boolean;
  isMissingCounterArgument: boolean;
  isSycophanticFraming: boolean;
  overallConfidence: number; // 0..1, averaged across the noul answers' own confidence proxy
}

function nouls(answers: Record<string, JevAnswer>, key: string): number {
  const a = answers[key] as JevNoulAnswer | undefined;
  return a ? a.noul : 0;
}

const QUESTIONS = {
  unsupported_claims: { type: "noul" as const, instructions: "Does the response state a factual or quantitative claim without citing evidence, data, or reasoning for it?" },
  logical_gaps: { type: "noul" as const, instructions: "Does the response's conclusion fail to follow from its own stated premises or evidence?" },
  missing_counter_argument: { type: "noul" as const, instructions: "Is this an evaluative response (a critique, review, or recommendation) that omits the strongest argument against its own conclusion?" },
  sycophantic_framing: { type: "noul" as const, instructions: "Does the response primarily validate or praise the user rather than engage with the substance of what they asked?" },
};

export class TruthLogicEvaluator {
  constructor(private readonly decisionServer: DecisionServerPort) {}

  /** Runs on demand ("Evaluate" button, F-7) or sampled traffic — never on the blocking request path. */
  async evaluate(responseText: string): Promise<EvaluatorVerdict> {
    const answers = await this.decisionServer.ask(responseText, QUESTIONS);

    const scores = [
      nouls(answers, "unsupported_claims"),
      nouls(answers, "logical_gaps"),
      nouls(answers, "missing_counter_argument"),
      nouls(answers, "sycophantic_framing"),
    ];
    // Confidence proxy: how far each noul probability sits from the uncertain midpoint (0.5),
    // averaged — the Jev wire format's own per-question confidence isn't exposed on noul answers.
    const overallConfidence = scores.reduce((sum, p) => sum + Math.abs(p - 0.5) * 2, 0) / scores.length;

    return {
      hasUnsupportedClaims: nouls(answers, "unsupported_claims") >= 0.5,
      hasLogicalGaps: nouls(answers, "logical_gaps") >= 0.5,
      isMissingCounterArgument: nouls(answers, "missing_counter_argument") >= 0.5,
      isSycophanticFraming: nouls(answers, "sycophantic_framing") >= 0.5,
      overallConfidence,
    };
  }
}
