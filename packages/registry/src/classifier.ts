import { TaskClassification, type TaskCategory } from "@honesty/core";
import type { TaskClassifierPort } from "./classifierPort.js";

const CRISIS_PATTERNS = [
  /\b(suicid|kill myself|end my life|self[- ]harm|hurt myself)\b/i,
  /\b(i (want|'m going) to die)\b/i,
];

const PERSONAL_EMOTIONAL_PATTERNS = [
  /\b(anxious|anxiety|depress|grief|grieving|relationship|breakup|divorce|lonely|panic attack)\b/i,
  /\b(feel(ing)? (really |so )?(sad|hopeless|overwhelmed|scared))\b/i,
];

const MECHANICAL_PATTERNS = [
  /^(translate|format|convert|capitalize|sort|rename|re[- ]?format)\b/i,
  /\b(translate (this|the following)|format (this|the following) (table|list|json))\b/i,
];

const EVALUATIVE_PATTERNS = [
  /\b(review|critique|evaluate|is this (good|sound|a good idea)|what('s| is) wrong with|stress[- ]test|red[- ]team)\b/i,
  /\b(should i|is it (a good|the right) (idea|call|move))\b/i,
];

/** F-1 input-stage classifier: rules today, a local model can sit behind TaskClassifierPort later. */
export class RuleBasedTaskClassifier implements TaskClassifierPort {
  classify(userMessage: string): TaskClassification {
    const category: TaskCategory = this.categorize(userMessage);
    return new TaskClassification(category);
  }

  private categorize(text: string): TaskCategory {
    if (CRISIS_PATTERNS.some((re) => re.test(text))) return "crisis";
    if (PERSONAL_EMOTIONAL_PATTERNS.some((re) => re.test(text))) return "personal_emotional";
    if (MECHANICAL_PATTERNS.some((re) => re.test(text))) return "mechanical";
    if (EVALUATIVE_PATTERNS.some((re) => re.test(text))) return "evaluative";
    return "factual";
  }
}
