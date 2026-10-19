/** C-5: Decision Check — guided pre-mortem flow for bigger decisions. */
export interface DecisionCheckInput {
  decisionSummary: string;
  decisionKind: "job_offer" | "purchase" | "business" | "move" | "other";
}

export function buildDecisionCheckPrompt(input: DecisionCheckInput): { systemDirective: string; userPrompt: string } {
  const systemDirective =
    "Help the user stress-test a real decision before they commit. Respond with: " +
    "a pre-mortem (it is a year later and this went badly — why?), the strongest case against the decision, " +
    "base rates where you genuinely know them (say so if you don't), and three questions they should answer " +
    "before committing. Be direct. Do not manufacture objections if the decision is genuinely sound — say so plainly instead.";
  const userPrompt = `Decision (${input.decisionKind}): ${input.decisionSummary}`;
  return { systemDirective, userPrompt };
}

/** The Decision Journal entry a user saves to check back on in 30/90 days. */
export interface DecisionJournalEntry {
  id: string;
  createdAt: string;
  decision: DecisionCheckInput;
  critiqueSummary: string;
  reminderAt: "30d" | "90d";
  outcome?: { recordedAt: string; whatHappened: string; critiqueWasRight: boolean | null };
}

export function dueDate(createdAt: Date, reminder: "30d" | "90d"): Date {
  const days = reminder === "30d" ? 30 : 90;
  return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
}
