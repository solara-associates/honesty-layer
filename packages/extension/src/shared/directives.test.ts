import { describe, expect, it } from "vitest";
import { consumerVisible, getDirectiveForHost } from "./directives.js";

describe("getDirectiveForHost", () => {
  it("resolves claude.ai to the anthropic family", () => {
    const directive = getDirectiveForHost("claude.ai", "calibrated", 3);
    expect(directive?.modelFamily).toBe("anthropic");
  });

  it("resolves chatgpt.com to the openai family", () => {
    const directive = getDirectiveForHost("chatgpt.com", "calibrated", 3);
    expect(directive?.modelFamily).toBe("openai");
  });

  it("resolves gemini.google.com to the google family", () => {
    const directive = getDirectiveForHost("gemini.google.com", "calibrated", 3);
    expect(directive?.modelFamily).toBe("google");
    expect(directive?.text).toContain("Skip compliments");
  });

  it("falls back to the nearest lower authored intensity", () => {
    const directive = getDirectiveForHost("chatgpt.com", "calibrated", 2);
    expect(directive?.intensity).toBe(1);
  });

  it("returns null below the only authored off-mode intensity tier (no fabricated fallback)", () => {
    // "off" mode is only authored at intensity 3; nothing exists at or below 1.
    const directive = getDirectiveForHost("chatgpt.com", "off" as never, 1);
    expect(directive).toBeNull();
  });
});

describe("consumerVisible", () => {
  it("hides intensity 5 (Builders-only, PRD 6.4)", () => {
    expect(consumerVisible(5)).toBe(false);
  });

  it("shows intensities 1-4", () => {
    for (const i of [1, 2, 3, 4]) expect(consumerVisible(i)).toBe(true);
  });
});
