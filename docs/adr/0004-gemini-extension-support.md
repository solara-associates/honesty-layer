# ADR-0004: Bring Gemini into the browser extension, verified live

## Status

Accepted.

## Context

Gemini was covered by the Directive Registry and the web Setup wizard, but
the browser extension (F-2) only ran on claude.ai and chatgpt.com — matching
PRD 5.1's "Gemini in V1.1" phasing. Asked to test the extension against
Gemini live, which meant building it first.

## Decision

Added `gemini.google.com` as a third supported site:

- `shared/storage.ts`: `SiteHost` gains `"gemini.google.com"`, with defaults.
- `shared/selectorConfig.ts`: composer/send-button/assistant-message
  selectors — **verified against the live DOM** via DevTools console on
  `gemini.google.com/app` (2026-10-20), not guessed:
  `rich-textarea .ql-editor[contenteditable="true"]`,
  `button[aria-label="Send message"]`, `message-content`.
- `shared/directives.ts`: `HOST_TO_FAMILY` maps it to the registry's
  existing `google` model family (already authored, just not bundled for
  the extension before).
- `manifest.json`: content script + optional host permission for
  `https://gemini.google.com/*`.

### Two real bugs found and fixed while testing this live, not during code review

1. **Per-site enablement never actually requested the browser permission.**
   The popup's "On this site" toggle only flipped our own stored setting;
   `optional_host_permissions` grants nothing until something calls
   `chrome.permissions.request()` from a user gesture, and nothing did.
   Fixed: the popup now checks `chrome.permissions.contains()` and shows a
   "Allow Honesty Layer on this site" button that requests it when missing.

2. **Chicken-and-egg: `tab.url` is hidden until permission is already
   granted.** Once the request button existed, the popup still couldn't
   tell *which* origin to request — `chrome.tabs.query()` doesn't reveal a
   tab's URL without either `"activeTab"` or an already-granted host
   permission for that origin. Fixed by adding `"activeTab"` to
   `permissions`, which reveals the active tab's URL specifically for the
   user-gesture-triggered popup open (it does not grant persistent content-
   script access on its own — the separate `chrome.permissions.request()`
   flow still does that).

Both were caught only because the plan was to actually click through it on
a real site rather than stop at unit tests passing.

## Verification

Live test on `gemini.google.com/app` (not mocked): typed a flawed premise
("charge customers monthly, let them cancel any time with no notice
period"), confirmed the actually-sent message contained the injected
Calibrated directive (`⟦honesty-layer:start⟧...⟦honesty-layer:end⟧`), and
Gemini's real response followed the directive's structure — led with the
flaw, gave the strongest counter-argument before concluding, stated
confidence (90%) and what evidence would change it. Console clean on both
fresh load and after the interaction.

## Consequences

- claude.ai and chatgpt.com's selectors are still unverified against the
  live DOM (unchanged from before) — only Gemini's were checked this round.
- The permission-request UX (`grant-access` button) now exists for all
  three sites, not just Gemini; claude.ai and chatgpt.com benefit from the
  same fix.
- Test count: 86 → 89 (`directives.test.ts` +1, `selectorConfig.test.ts`
  new file, +2).
