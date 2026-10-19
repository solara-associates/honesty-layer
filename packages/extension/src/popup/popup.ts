import { getSettings, updateSettings, type SiteHost } from "../shared/storage.js";
import { fireAndForget } from "../shared/async.js";

function currentHost(tab: chrome.tabs.Tab | undefined): SiteHost | null {
  if (!tab?.url) return null;
  try {
    const hostname = new URL(tab.url).hostname;
    if (hostname === "claude.ai" || hostname === "chatgpt.com") return hostname;
  } catch {
    // not a parseable URL (new tab page, chrome://, etc.)
  }
  return null;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = currentHost(tab);
  const settings = await getSettings();

  const siteEnabledEl = document.getElementById("site-enabled") as HTMLInputElement;
  const modeEl = document.getElementById("mode") as HTMLSelectElement;
  const intensityEl = document.getElementById("intensity") as HTMLSelectElement;
  const statusEl = document.getElementById("site-status") as HTMLParagraphElement;
  const diffButton = document.getElementById("see-what-was-added") as HTMLButtonElement;

  if (!host) {
    statusEl.textContent = "Open claude.ai or chatgpt.com to use Honesty Layer.";
    siteEnabledEl.disabled = true;
    modeEl.disabled = true;
    intensityEl.disabled = true;
    diffButton.disabled = true;
    return;
  }

  siteEnabledEl.checked = settings.enabledSites[host];
  modeEl.value = settings.mode;
  intensityEl.value = String(settings.intensity === 5 ? 4 : settings.intensity); // 5 is Builders-only (6.4)

  const disabledReason = settings.siteDisabledByHealthCheck[host];
  if (disabledReason) statusEl.textContent = disabledReason;

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
