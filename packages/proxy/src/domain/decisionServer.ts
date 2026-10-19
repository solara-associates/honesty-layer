/**
 * Wire shapes for a Jev-compatible "System One" decision server (noul /
 * choice / score questions in, calibrated answers out). Lives in domain so
 * both application (the F-7 Evaluator, which depends only on the port) and
 * infrastructure (JevClient, which implements it) can depend on it without
 * application reaching into infrastructure (A3).
 */
export type JevQuestion =
  | { type: "noul"; instructions: string; criteria?: { true?: string; false?: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export interface JevNoulAnswer {
  noul: number; // P(yes), 0..1
}
export interface JevChoiceAnswer {
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}
export interface JevScoreAnswer {
  score: number;
  legend: string;
  probabilities: number[];
  confidence: number;
}
export type JevAnswer = JevNoulAnswer | JevChoiceAnswer | JevScoreAnswer;

/** A6.port — the decision server is infrastructure; application code depends only on this. */
export interface DecisionServerPort {
  ask(state: string, questions: Record<string, JevQuestion>): Promise<Record<string, JevAnswer>>;
}
