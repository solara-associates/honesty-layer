import { describe, expect, it } from "vitest";
import { loadSelectorConfig } from "./selectorConfig.js";

describe("loadSelectorConfig", () => {
  it("has selectors for every known host", () => {
    for (const host of ["claude.ai", "chatgpt.com", "gemini.google.com"] as const) {
      const selectors = loadSelectorConfig(host);
      expect(selectors.composerSelector).toBeTruthy();
      expect(selectors.sendButtonSelector).toBeTruthy();
      expect(selectors.assistantMessageSelector).toBeTruthy();
      expect(selectors.nativeInstructionsUrl).toMatch(/^https:\/\//);
    }
  });

  it("gemini.google.com selectors match what was verified live against the real DOM (2026-10-20)", () => {
    const selectors = loadSelectorConfig("gemini.google.com");
    expect(selectors.composerSelector).toBe('rich-textarea .ql-editor[contenteditable="true"]');
    expect(selectors.sendButtonSelector).toBe('button[aria-label="Send message"]');
    expect(selectors.assistantMessageSelector).toBe("message-content");
  });
});
