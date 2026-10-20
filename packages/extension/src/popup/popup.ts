import { clearHealthCheckDisable, getSettings, updateSettings, type SiteHost } from "../shared/storage.js";
import { getWeeklyRecap } from "../shared/weeklyEvents.js";
import { fireAndForget } from "../shared/async.js";

const KNOWN_HOSTS: SiteHost[] = ["claude.ai", "chatgpt.com", "gemini.google.com"];

/**
 * `tab.url` is undefined here unless the manifest declares "activeTab" (or
 * host permission for that origin is already granted) — without it, Chrome
 * hides the URL from exactly the query that would otherwise let us detect
 * "this tab needs a permission grant," a real chicken-and-egg bug found
 * while testing the Gemini rollout live. "activeTab" grants that visibility
 * for this one user-gesture-triggered popup open; it doesn't persist the
 * content script's own host permission, which is still the separate
 * chrome.permissions.request() flow below.
 */
function currentHost(tab: chrome.tabs.Tab | undefined): SiteHost | null {
  if (!tab?.url) return null;
  try {
    const hostname = new URL(tab.url).hostname;
    if ((KNOWN_HOSTS as string[]).includes(hostname)) return hostname as SiteHost;
  } catch {
    // not a parseable URL (new tab page, chrome://, etc.)
  }
  return null;
}

function originPatternFor(host: SiteHost): string {
  return `https://${host}/*`;
}

async function renderWeeklyRecap() {
  const container = document.getElementById("weekly-recap") as HTMLDivElement;
  const textEl = document.getElementById("recap-text") as HTMLParagraphElement;
  const shareButton = document.getElementById("share-recap") as HTMLButtonElement;

  const { recap, shareText } = await getWeeklyRecap();
  if (recap.totalResponses === 0) return; // nothing to show yet this week

  container.hidden = false;
  textEl.textContent = shareText;
  shareButton.addEventListener("click", () => {
    // C-6: numbers only, never prompt content — shareText already carries exactly that.
    fireAndForget(navigator.clipboard.writeText(shareText), "copying recap share text");
  });
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = currentHost(tab);
  const settings = await getSettings();

  fireAndForget(renderWeeklyRecap(), "rendering weekly recap");

  const grantButton = document.getElementById("grant-access") as HTMLButtonElement;
  const siteEnabledRow = document.getElementById("site-enabled-row") as HTMLLabelElement;
  const siteEnabledEl = document.getElementById("site-enabled") as HTMLInputElement;
  const modeEl = document.getElementById("mode") as HTMLSelectElement;
  const intensityEl = document.getElementById("intensity") as HTMLSelectElement;
  const statusEl = document.getElementById("site-status") as HTMLParagraphElement;
  const diffButton = document.getElementById("see-what-was-added") as HTMLButtonElement;
  const tryAgainButton = document.getElementById("try-again") as HTMLButtonElement;

  if (!host) {
    statusEl.textContent = "Open claude.ai, chatgpt.com, or gemini.google.com to use Honesty Layer.";
    siteEnabledRow.hidden = true;
    modeEl.disabled = true;
    intensityEl.disabled = true;
    diffButton.disabled = true;
    return;
  }

  // Per-site enablement (5.2/F-2) needs the browser's own host permission, not
  // just our own setting — host_permissions here are optional, so nothing
  // runs on a site until chrome.permissions.request() is granted from a user
  // gesture. Toggling our stored "enabled" setting alone does nothing if this
  // was never granted; this is that missing grant step.
  const origin = originPatternFor(host);
  const hasPermission = await chrome.permissions.contains({ origins: [origin] });

  if (!hasPermission) {
    grantButton.hidden = false;
    siteEnabledRow.hidden = true;
    modeEl.disabled = true;
    intensityEl.disabled = true;
    diffButton.disabled = true;
    statusEl.textContent = "Honesty Layer needs permission to run on this site.";

    grantButton.addEventListener("click", () => {
      fireAndForget(
        (async () => {
          const granted = await chrome.permissions.request({ origins: [origin] });
          if (granted) {
            window.close(); // reopening the popup re-runs init() against the now-granted state
          } else {
            statusEl.textContent = "Permission was not granted — Honesty Layer can't run here.";
          }
        })(),
        "requesting host permission"
      );
    });
    return;
  }

  siteEnabledEl.checked = settings.enabledSites[host];
  modeEl.value = settings.mode;
  intensityEl.value = String(settings.intensity === 5 ? 4 : settings.intensity); // 5 is Builders-only (6.4)

  const disabledReason = settings.siteDisabledByHealthCheck[host];
  if (disabledReason) {
    statusEl.textContent = disabledReason;
    tryAgainButton.hidden = false;
    tryAgainButton.addEventListener("click", () => {
      fireAndForget(
        (async () => {
          await clearHealthCheckDisable(host);
          if (tab?.id) await chrome.tabs.reload(tab.id);
          window.close();
        })(),
        "clearing health-check disable and reloading"
      );
    });
  }

  siteEnabledEl.addEventListener("change", () => {
    fireAndForget(updateSettings({ enabledSites: { ...settings.enabledSites, [host]: siteEnabledEl.checked } }), "saving site-enabled setting");
  });
  modeEl.addEventListener("change", () => {
    fireAndForget(updateSettings({ mode: modeEl.value as typeof settings.mode }), "saving mode setting");
  });
  intensityEl.addEventListener("change", () => {
    fireAndForget(updateSettings({ intensity: Number(intensityEl.value) as typeof settings.intensity }), "saving intensity setting");
  });
  diffButton.addEventListener("click", () => {
    fireAndForget(
      (async () => {
        if (!tab?.id) return;
        await chrome.tabs.sendMessage(tab.id, { type: "honesty:toggle-diff-drawer" });
        window.close();
      })(),
      "opening diff drawer"
    );
  });
}

fireAndForget(init(), "popup init");
