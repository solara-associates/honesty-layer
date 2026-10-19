import { getSettings, updateSettings } from "../shared/storage.js";

/** Installs defaults on first run; otherwise a passive background worker (Manifest V3, no persistent background page). */
chrome.runtime.onInstalled.addListener(() => {
  (async () => {
    const settings = await getSettings();
    await updateSettings(settings); // persist defaults on first install
  })().catch((err: unknown) => {
    console.error("[Honesty Layer] onInstalled setup failed:", err);
  });
});
