/**
 * C-6: Flattery Meter and Weekly Recap. Computed entirely from local events —
 * "nothing leaves the device" (F-9/C-6). The caller supplies the week's
 * locally-logged events; this module only aggregates.
 */
export interface WeeklyEvent {
  flagged: boolean; // detector flagged this response (F-5)
  modelBackedDownOnPushback: boolean; // F-6
  modeUsed: string;
}

export interface WeeklyRecap {
  totalResponses: number;
  flaggedShare: number; // 0..1 — "This week my AI agreed with me X% of the time" uses 1 - flaggedShare framing in copy
  backedDownShare: number;
  modeUsageCounts: Record<string, number>;
}

export function computeWeeklyRecap(events: WeeklyEvent[]): WeeklyRecap {
  if (events.length === 0) {
    return { totalResponses: 0, flaggedShare: 0, backedDownShare: 0, modeUsageCounts: {} };
  }
  const modeUsageCounts: Record<string, number> = {};
  let flagged = 0;
  let backedDown = 0;
  for (const e of events) {
    if (e.flagged) flagged++;
    if (e.modelBackedDownOnPushback) backedDown++;
    modeUsageCounts[e.modeUsed] = (modeUsageCounts[e.modeUsed] ?? 0) + 1;
  }
  return {
    totalResponses: events.length,
    flaggedShare: flagged / events.length,
    backedDownShare: backedDown / events.length,
    modeUsageCounts,
  };
}

/** The shareable recap card text — numbers only, never prompt content (C-6). */
export function recapShareText(recap: WeeklyRecap): string {
  const agreedShare = Math.round((1 - recap.flaggedShare) * 100);
  return `This week my AI agreed with me ${agreedShare}% of the time — checked with Honesty Layer.`;
}
