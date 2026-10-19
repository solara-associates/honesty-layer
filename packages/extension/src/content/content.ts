import { detectSycophancy } from "@honesty/core";
import { getDirectiveForHost } from "../shared/directives.js";
import { loadSelectorConfig } from "../shared/selectorConfig.js";
import { classifyAndSafeguard } from "../shared/classification.js";
import { disableSiteForHealthCheck, getSettings, type SiteHost } from "../shared/storage.js";
import { fireAndForget } from "../shared/async.js";

const HOST: SiteHost | null = location.hostname === "claude.ai" ? "claude.ai" : location.hostname === "chatgpt.com" ? "chatgpt.com" : null;

const INJECTION_DELIMITER_START = "\n\n⟦honesty-layer:start⟧\n";
const INJECTION_DELIMITER_END = "\n⟦honesty-layer:end⟧";

let lastAppliedText = "";
let lastAppliedDirectiveId: string | null = null;

function getComposer(): HTMLElement | null {
  const selectors = HOST ? loadSelectorConfig(HOST) : null;
  if (!selectors) return null;
  return document.querySelector<HTMLElement>(selectors.composerSelector);
}

function getSendButton(): HTMLElement | null {
  const selectors = HOST ? loadSelectorConfig(HOST) : null;
  if (!selectors) return null;
  return document.querySelector<HTMLElement>(selectors.sendButtonSelector);
}

function readComposerText(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement) return el.value;
  return el.innerText;
}

function writeComposerText(el: HTMLElement, text: string): void {
  if (el instanceof HTMLTextAreaElement) {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  el.innerText = text;
  el.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

/** F-2 health check / kill switch (R-2): verify the selectors this release ships with still match. */
async function runHealthCheck(host: SiteHost): Promise<boolean> {
  const composerFound = getComposer() !== null;
  if (!composerFound) {
    await disableSiteForHealthCheck(host, "Could not find the message box on this page. Honesty Layer has turned itself off here until this is fixed.");
    showBanner("Honesty Layer disabled itself on this page — the site's layout changed and it could not find the message box safely.");
    return false;
  }
  return true;
}

function showBanner(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText =
    "position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#111827;color:#f3f4f6;padding:10px 14px;border-radius:8px;font:13px system-ui;max-width:320px;box-shadow:0 4px 16px rgba(0,0,0,.3)";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 8000);
}

function showDiffDrawer() {
  const existing = document.getElementById("honesty-layer-diff-drawer");
  if (existing) {
    existing.remove();
    return;
  }
  const el = document.createElement("div");
  el.id = "honesty-layer-diff-drawer";
  el.style.cssText =
    "position:fixed;bottom:60px;right:16px;z-index:2147483647;background:#111827;color:#f3f4f6;padding:12px 14px;border-radius:8px;font:12px/1.5 system-ui;max-width:360px;white-space:pre-wrap;box-shadow:0 4px 16px rgba(0,0,0,.3)";
  el.textContent = lastAppliedText
    ? `Added before sending (${lastAppliedDirectiveId ?? "unknown version"}):\n\n${lastAppliedText}`
    : "Nothing has been added yet — send a message first, or this task did not need a directive.";
  document.body.appendChild(el);
}

async function onBeforeSend(host: SiteHost) {
  const composer = getComposer();
  if (!composer) return;
  const userText = readComposerText(composer);
  if (!userText.trim()) return;

  const settings = await getSettings();
  if (settings.mode === "off" || !settings.enabledSites[host]) return;

  const { decision } = await classifyAndSafeguard(userText, settings.mode, settings.intensity);
  if (decision.kind === "no_directive") {
    lastAppliedText = "";
    lastAppliedDirectiveId = null;
    return;
  }

  const effective = decision.kind === "override" ? { mode: decision.mode, intensity: decision.intensity } : { mode: settings.mode, intensity: settings.intensity };
  const directive = getDirectiveForHost(host, effective.mode, effective.intensity);
  if (!directive) return;

  lastAppliedText = directive.text;
  lastAppliedDirectiveId = directive.id;

  const withDirective = `${userText}${INJECTION_DELIMITER_START}${directive.text}${INJECTION_DELIMITER_END}`;
  writeComposerText(composer, withDirective);
}

/** F-5 output detector + F-6 "Challenge this" (Section 5: < 50ms after stream completes, local heuristics only). */
function attachOutputObserver(host: SiteHost) {
  const selectors = loadSelectorConfig(host);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const messages = node.matches(selectors.assistantMessageSelector) ? [node] : Array.from(node.querySelectorAll<HTMLElement>(selectors.assistantMessageSelector));
        for (const message of messages) flagMessageIfSycophantic(message);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function flagMessageIfSycophantic(message: HTMLElement) {
  if (message.dataset.honestyChecked === "true") return;
  message.dataset.honestyChecked = "true";
  const text = message.innerText;
  const flags = detectSycophancy(text);
  if (flags.length === 0) return;

  const badge = document.createElement("span");
  badge.textContent = `⚑ flattery? ${flags[0]?.reason ?? ""}`;
  badge.style.cssText = "display:inline-block;margin-top:6px;padding:2px 8px;border-radius:999px;background:#fde68a;color:#78350f;font:11px system-ui;cursor:pointer";
  badge.title = 'Click to send "Are you just agreeing with me?"';
  badge.addEventListener("click", () => fireAndForget(sendChallenge(), "sending challenge"));
  message.appendChild(document.createElement("br"));
  message.appendChild(badge);
}

async function sendChallenge() {
  const composer = getComposer();
  const sendButton = getSendButton();
  if (!composer || !sendButton) return;
  writeComposerText(composer, "Are you just agreeing with me? Argue against your own last answer and tell me what would change your view.");
  sendButton.click();
}

// Known limitation (R-2/5.2): onBeforeSend is async (storage read) while the
// site's own Enter/click submit handler may fire synchronously, so on some
// pages the directive can land one message late. A more robust version would
// intercept with preventDefault + stopImmediatePropagation and resubmit
// manually once injection completes; left as a follow-up rather than shipped
// as a false guarantee.
async function main() {
  if (!HOST) return;
  const settings = await getSettings();
  if (settings.siteDisabledByHealthCheck[HOST]) return;
  if (!(await runHealthCheck(HOST))) return;
  if (!settings.enabledSites[HOST]) return;

  attachOutputObserver(HOST);

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) fireAndForget(onBeforeSend(HOST), "injecting directive on Enter");
    },
    { capture: true }
  );
  document.addEventListener(
    "click",
    (e) => {
      const sendButton = getSendButton();
      if (sendButton && (e.target === sendButton || sendButton.contains(e.target as Node))) fireAndForget(onBeforeSend(HOST), "injecting directive on send click");
    },
    { capture: true }
  );

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "honesty:toggle-diff-drawer") showDiffDrawer();
  });
}

fireAndForget(main(), "content script init");
