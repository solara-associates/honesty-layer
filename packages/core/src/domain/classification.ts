export const TASK_CATEGORIES = [
  "evaluative",
  "factual",
  "mechanical",
  "personal_emotional",
  "crisis",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

/**
 * Result of the input-stage task classifier (F-1, Section 5). Pure data —
 * classification logic itself lives in application-layer services, never here
 * (A5.1: no business logic in domain-adjacent data holders... actually this
 * IS the domain layer; the classifier *service* is application-layer and
 * depends on this type, not the reverse).
 */
export class TaskClassification {
  readonly category: TaskCategory;

  constructor(category: TaskCategory) {
    this.category = category;
    Object.freeze(this);
  }

  get isPersonalOrEmotional(): boolean {
    return this.category === "personal_emotional" || this.category === "crisis";
  }

  /** C-8: on crisis signals, no directive is added at all. */
  get isCrisis(): boolean {
    return this.category === "crisis";
  }

  /** F-1: task-aware selection skips/lightens directives for mechanical tasks. */
  get skipsCritique(): boolean {
    return this.category === "mechanical";
  }
}
