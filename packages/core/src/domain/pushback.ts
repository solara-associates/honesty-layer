/**
 * Pushback Stability (F-6): detect a user turn that pushes back without new
 * evidence, so the application layer can decide whether to add the
 * "hold your ground" directive. Pure text heuristic.
 */
const PUSHBACK_NO_EVIDENCE = [
  /^are you sure\??$/i,
  /^i don'?t think so\.?$/i,
  /^(really|seriously)\??$/i,
  /^that'?s (not )?right\.?$/i,
  /^no,? that'?s wrong\.?$/i,
];

const EVIDENCE_MARKERS = [
  /\bactually\b/i,
  /\baccording to\b/i,
  /\bhere'?s (a |the )?(source|link|study|paper|data)\b/i,
  /\bbecause\b/i,
  /\bi (checked|tested|measured|found)\b/i,
];

export interface PushbackAssessment {
  isPushback: boolean;
  hasNewEvidence: boolean;
}

export function assessPushback(userTurnText: string): PushbackAssessment {
  const trimmed = userTurnText.trim();
  const isPushback = PUSHBACK_NO_EVIDENCE.some((re) => re.test(trimmed)) || trimmed.length < 40;
  const hasNewEvidence = EVIDENCE_MARKERS.some((re) => re.test(trimmed));
  return { isPushback: isPushback && !hasNewEvidence, hasNewEvidence };
}
