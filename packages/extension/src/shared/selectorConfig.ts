import type { SiteHost } from "./storage.js";

export interface SiteSelectors {
  composerSelector: string;
  sendButtonSelector: string;
  assistantMessageSelector: string;
  nativeInstructionsUrl: string;
}

/**
 * Section 5.2 constraint: "DOM fragility... requires a selector health check,
 * remote selector configuration (data only, no remote code under Manifest
 * V3) and a kill switch per site."
 *
 * This build ships only the bundled, reviewed defaults below. A production
 * build would fetch a signed JSON document and verify its signature before
 * use; until that signing/verification path exists, fetching unsigned
 * remote selector data would be a fail-open security control (A5.7), so it
 * is deliberately NOT implemented here rather than implemented insecurely.
 * `loadSelectorConfig` is the single seam to add it later.
 *
 * These selectors have not been verified against the live DOM of claude.ai
 * or chatgpt.com from this environment — they are a best-effort starting
 * point. The health check in content.ts is what makes a wrong selector a
 * safe, visible failure (auto-disable + user notice) rather than a silent one.
 */
const BUNDLED_DEFAULTS: Record<SiteHost, SiteSelectors> = {
  "claude.ai": {
    composerSelector: 'div[contenteditable="true"][enterkeyhint]',
    sendButtonSelector: 'button[aria-label="Send Message"]',
    assistantMessageSelector: '[data-testid="chat-message"]',
    nativeInstructionsUrl: "https://claude.ai/settings/profile",
  },
  "chatgpt.com": {
    composerSelector: "#prompt-textarea",
    sendButtonSelector: '[data-testid="send-button"]',
    assistantMessageSelector: '[data-message-author-role="assistant"]',
    nativeInstructionsUrl: "https://chatgpt.com/#settings/Personalization",
  },
};

export function loadSelectorConfig(host: SiteHost): SiteSelectors {
  return BUNDLED_DEFAULTS[host];
}
