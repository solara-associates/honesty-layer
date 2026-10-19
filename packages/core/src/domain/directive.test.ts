import { describe, expect, it } from "vitest";
import { Directive, InvalidDirectiveError } from "./directive.js";

describe("Directive", () => {
  const valid = {
    id: "calibrated-openai-i3",
    version: "2026-10-19",
    mode: "calibrated" as const,
    intensity: 3 as const,
    modelFamily: "openai" as const,
    text: "Respond as a candid, expert reviewer.",
  };

  it("constructs with valid params and is frozen", () => {
    const d = new Directive(valid);
    expect(d.appliedId).toBe("calibrated:openai:i3@2026-10-19");
    expect(Object.isFrozen(d)).toBe(true);
    expect(() => {
      // @ts-expect-error immutability check
      d.text = "mutated";
    }).toThrow();
  });

  it("rejects empty id", () => {
    expect(() => new Directive({ ...valid, id: "  " })).toThrow(InvalidDirectiveError);
  });

  it("rejects malformed version", () => {
    expect(() => new Directive({ ...valid, version: "latest" })).toThrow(InvalidDirectiveError);
  });

  it("accepts semantic version", () => {
    const d = new Directive({ ...valid, version: "v1.2" });
    expect(d.version).toBe("v1.2");
  });

  it("rejects empty text", () => {
    expect(() => new Directive({ ...valid, text: "" })).toThrow(InvalidDirectiveError);
  });
});
