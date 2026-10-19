/**
 * C-3: the Honesty Keyboard's two keys. Both produce plain text with no
 * network access required to insert (privacy/app-review constraint: "no
 * keystrokes leave the phone").
 */

/** "Straight answer" key — a compact directive, not the full tested text (keyboards have limited insertion UX). */
export const STRAIGHT_ANSWER_SNIPPET =
  "Please answer straight: skip compliments and openers, state the most important flaw if there is one, " +
  "agree plainly if I'm right, and say how confident you are.";

/** "Are you just agreeing with me?" key — same challenge text used by the extension's Challenge-this action (F-6). */
export const CHALLENGE_SNIPPET = "Are you just agreeing with me? Argue against your own last answer and tell me what would change your view.";

export function insertStraightAnswer(currentText: string): string {
  return currentText.trim().length > 0 ? `${currentText.trim()}\n\n${STRAIGHT_ANSWER_SNIPPET}` : STRAIGHT_ANSWER_SNIPPET;
}
