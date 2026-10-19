import type { Intensity, Mode, TaskClassification } from "@honesty/core";

/**
 * C-8 Wellbeing Safeguards (consumer-specific, mandatory, release-blocking).
 * This is the one place the input stage is allowed to override the user's
 * chosen mode/intensity — every other override belongs in the caller.
 */
export type WellbeingDecision =
  | { kind: "no_directive"; reason: "crisis_passthrough" }
  | { kind: "override"; mode: Mode; intensity: Intensity; reason: "automatic_softening" }
  | { kind: "unchanged" };

export function applyWellbeingSafeguard(
  requested: { mode: Mode; intensity: Intensity },
  classification: TaskClassification
): WellbeingDecision {
  // Crisis passthrough: no directive at all; provider safety behaviour applies unchanged.
  if (classification.isCrisis) {
    return { kind: "no_directive", reason: "crisis_passthrough" };
  }

  // Automatic softening: personal/emotional topics force Calibrated at Gentle (1),
  // and "No sugar-coating" (brutal) is unavailable regardless of what was requested.
  if (classification.isPersonalOrEmotional) {
    if (requested.mode !== "calibrated" || requested.intensity > 1) {
      return { kind: "override", mode: "calibrated", intensity: 1, reason: "automatic_softening" };
    }
  }

  return { kind: "unchanged" };
}

/** Consumers never see "brutal"/"unfiltered" labels; intensity 5 is Builders-only (6.4). */
export function isConsumerVisible(mode: Mode, intensity: Intensity): boolean {
  if (intensity === 5) return false;
  return true;
}
