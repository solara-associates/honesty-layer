import { computeWeeklyRecap, recapShareText, type WeeklyEvent, type WeeklyRecap } from "@honesty/mobile-shared";

/**
 * C-6 Flattery Meter / weekly recap, F-9 "nothing leaves the device": the
 * one durable store for this is chrome.storage.local, same as settings
 * (A5.10). Fixes fragility #5 — computeWeeklyRecap was correct and tested
 * but had no producer anywhere in the extension; this is that producer.
 */
interface LoggedEvent extends WeeklyEvent {
  loggedAt: string; // ISO timestamp, used to prune to a rolling 7-day window
}

const STORAGE_KEY = "honestyWeeklyEvents";
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function readAll(): Promise<LoggedEvent[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return (stored[STORAGE_KEY] as LoggedEvent[] | undefined) ?? [];
}

function pruneToWindow(events: LoggedEvent[]): LoggedEvent[] {
  const cutoff = Date.now() - WINDOW_MS;
  return events.filter((e) => new Date(e.loggedAt).getTime() >= cutoff);
}

export async function logWeeklyEvent(event: WeeklyEvent): Promise<void> {
  const existing = await readAll();
  const next = pruneToWindow([...existing, { ...event, loggedAt: new Date().toISOString() }]);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

export async function getWeeklyRecap(): Promise<{ recap: WeeklyRecap; shareText: string }> {
  const events = pruneToWindow(await readAll());
  const recap = computeWeeklyRecap(events);
  return { recap, shareText: recapShareText(recap) };
}
