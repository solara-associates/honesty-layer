import directives from "./directives.generated.json" with { type: "json" };
import type { SiteHost } from "./storage.js";

type DirectiveMode = "calibrated" | "brutal" | "socratic" | "redteam" | "off";
type ModelFamily = "openai" | "anthropic" | "google";

export interface ExtensionDirective {
  id: string;
  version: string;
  mode: string;
  intensity: number;
  modelFamily: string;
  text: string;
}

const HOST_TO_FAMILY: Record<SiteHost, ModelFamily> = {
  "claude.ai": "anthropic",
  "chatgpt.com": "openai",
  "gemini.google.com": "google",
};

/** Mirrors @honesty/registry's fallback rule: nearest lower authored intensity, never higher. Kept in sync manually — see packages/extension's generator script. */
export function getDirectiveForHost(host: SiteHost, mode: DirectiveMode, intensity: number): ExtensionDirective | null {
  const family = HOST_TO_FAMILY[host];
  const table = directives as Record<string, ExtensionDirective>;
  for (let i = intensity; i >= 1; i--) {
    const hit = table[`${mode}:${family}:${i}`];
    if (hit) return hit;
  }
  return null;
}

export function consumerVisible(intensity: number): boolean {
  return intensity < 5; // 6.4: intensity 5 is Builders-only, never shown to consumers
}
