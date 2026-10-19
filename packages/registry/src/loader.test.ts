import { describe, expect, it } from "vitest";
import { DirectiveNotFoundError, DirectiveRegistry } from "./loader.js";

describe("DirectiveRegistry", () => {
  const registry = new DirectiveRegistry();

  it("loads the seed registry with all authored combinations", () => {
    // 4 active modes x 3 model families x 3 intensity tiers (1,3,5) + 3 "off" = 39
    expect(registry.list().length).toBe(39);
  });

  it("returns the exact directive when authored", () => {
    const { directive, substituted } = registry.get("calibrated", "openai", 3);
    expect(substituted).toBe(false);
    expect(directive.mode).toBe("calibrated");
    expect(directive.intensity).toBe(3);
    expect(directive.text).toContain("Skip compliments");
  });

  it("falls back to the nearest lower authored intensity, never a higher one", () => {
    // intensity 2 was never authored; must fall back to 1, not 3.
    const { directive, substituted } = registry.get("calibrated", "openai", 2);
    expect(substituted).toBe(true);
    expect(directive.intensity).toBe(1);
  });

  it("fails closed when nothing exists at or below the requested intensity", () => {
    // "off" mode only authors intensity 3; intensity 1 has no exact match and
    // no lower tier to fall back to, so it must throw rather than guess.
    expect(() => registry.get("off", "openai", 1)).toThrow(DirectiveNotFoundError);
  });

  it("off mode carries effectively empty text for every family", () => {
    for (const family of ["openai", "anthropic", "google"] as const) {
      const { directive } = registry.get("off", family, 3);
      expect(directive.text.trim()).toBe("");
    }
  });
});
