/**
 * Durable state declared (A5.10): chrome.storage.local is the one store this
 * extension uses. No other persistence layer exists in this codebase — if
 * one is added later, declare it here too.
 */
export type SiteHost = "claude.ai" | "chatgpt.com" | "gemini.google.com";

export interface HonestySettings {
  enabledSites: Record<SiteHost, boolean>;
  mode: "calibrated" | "brutal" | "socratic" | "redteam" | "off";
  intensity: 1 | 2 | 3 | 4 | 5;
  nativeSyncOffered: Record<SiteHost, boolean>;
  siteDisabledByHealthCheck: Partial<Record<SiteHost, string>>; // host -> reason
}

const DEFAULTS: HonestySettings = {
  enabledSites: { "claude.ai": true, "chatgpt.com": true, "gemini.google.com": true },
  mode: "calibrated",
  intensity: 3,
  nativeSyncOffered: { "claude.ai": false, "chatgpt.com": false, "gemini.google.com": false },
  siteDisabledByHealthCheck: {},
};

export async function getSettings(): Promise<HonestySettings> {
  const stored = await chrome.storage.local.get("honestySettings");
  return { ...DEFAULTS, ...(stored.honestySettings ?? {}) };
}

export async function updateSettings(patch: Partial<HonestySettings>): Promise<HonestySettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ honestySettings: next });
  return next;
}

/** F-2 health check / kill switch: mark a site disabled with a user-visible reason. */
export async function disableSiteForHealthCheck(host: SiteHost, reason: string): Promise<void> {
  const current = await getSettings();
  await updateSettings({
    siteDisabledByHealthCheck: { ...current.siteDisabledByHealthCheck, [host]: reason },
  });
}

/** Lets the user clear a health-check disable from the popup instead of being stuck until storage is cleared manually. */
export async function clearHealthCheckDisable(host: SiteHost): Promise<void> {
  const current = await getSettings();
  const next = { ...current.siteDisabledByHealthCheck };
  delete next[host];
  await updateSettings({ siteDisabledByHealthCheck: next });
}
