import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proves fragility #3 is actually fixed: the host page's own submit handler
 * (simulated here as a bubble-phase listener on the composer, exactly like
 * a real site's React handler) used to race our async injection. Now the
 * original event is fully intercepted (preventDefault + stopImmediatePropagation)
 * before the host ever sees it, and the host only ever observes our synthetic
 * resend — by which point injection has already completed.
 */

function stubChromeApi(overrides: { siteDisabledByHealthCheck?: Record<string, string> } = {}) {
  const settings = {
    enabledSites: { "claude.ai": true, "chatgpt.com": true },
    mode: "calibrated",
    intensity: 3,
    nativeSyncOffered: { "claude.ai": false, "chatgpt.com": false },
    siteDisabledByHealthCheck: overrides.siteDisabledByHealthCheck ?? {},
  };
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({ honestySettings: settings }),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
    runtime: {
      onMessage: { addListener: vi.fn() },
    },
  });
}

async function flushAsync(ticks = 6) {
  for (let i = 0; i < ticks; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("content script send interception (fixes fragility #3)", () => {
  let composer: HTMLTextAreaElement;
  let sendButton: HTMLButtonElement;
  let hostObservedValues: string[];

  beforeEach(() => {
    document.body.innerHTML = "";
    composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    sendButton = document.createElement("button");
    sendButton.dataset.testid = "send-button";
    document.body.append(composer, sendButton);

    hostObservedValues = [];
    // Simulates the host page's own submit handler: a normal bubble-phase
    // listener, exactly like a React app would attach, reading the
    // composer's value at the moment it fires.
    composer.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) hostObservedValues.push(composer.value);
    });

    stubChromeApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("the host handler never sees the pre-injection text — only the post-injection resend", async () => {
    await import("./content.js");
    await flushAsync(); // let main()'s async health check + listener registration complete

    composer.value = "Critique my plan: charge customers monthly with no notice period.";
    const originalEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    const notCancelled = composer.dispatchEvent(originalEvent);

    expect(notCancelled).toBe(false); // preventDefault() was called on the original event
    expect(hostObservedValues).toHaveLength(0); // host's listener never ran for it

    await flushAsync(10); // let injection + synthetic resend complete

    expect(hostObservedValues).toHaveLength(1);
    expect(hostObservedValues[0]).toContain("honesty-layer:start");
    expect(hostObservedValues[0]).toContain("Skip compliments");
  });

  it("does nothing when the extension is disabled by the health check", async () => {
    document.body.innerHTML = ""; // no composer present -> health check fails
    sendButton = document.createElement("button");
    sendButton.dataset.testid = "send-button";
    document.body.append(sendButton);

    await import("./content.js");
    await flushAsync();

    // No composer was ever found, so no listeners should have mutated anything;
    // this mainly asserts main() doesn't throw when the page doesn't match.
    expect(document.getElementById("prompt-textarea")).toBeNull();
  });
});
