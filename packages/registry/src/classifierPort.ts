import type { TaskClassification } from "@honesty/core";

/**
 * A6.port — the classifier is reasoning infrastructure behind a port. Today's
 * implementation is rules-only; a small local model can be swapped in later
 * without touching callers (PRD Section 5: "rules plus a small local model").
 */
export interface TaskClassifierPort {
  classify(userMessage: string): Promise<TaskClassification>;
}
