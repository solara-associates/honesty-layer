import directives from "./directives.generated.json" with { type: "json" };

export type ModelFamily = "openai" | "anthropic" | "google";
export type DirectiveMode = "calibrated" | "brutal" | "socratic" | "redteam";

export interface Entry {
  id: string;
  version: string;
  mode: string;
  intensity: number;
  modelFamily: string;
  text: string;
}

/** Same fallback rule as @honesty/registry: nearest lower authored intensity, never higher. */
export function getDirective(mode: DirectiveMode, family: ModelFamily, intensity: number): Entry | null {
  const table = directives as Record<string, Entry>;
  for (let i = intensity; i >= 1; i--) {
    const hit = table[`${mode}:${family}:${i}`];
    if (hit) return hit;
  }
  return null;
}

export const APPS: { id: ModelFamily; label: string; settingsUrl: string; settingsLabel: string }[] = [
  { id: "openai", label: "ChatGPT", settingsUrl: "https://chatgpt.com/#settings/Personalization", settingsLabel: "Settings → Personalization → Custom instructions" },
  { id: "anthropic", label: "Claude", settingsUrl: "https://claude.ai/settings/profile", settingsLabel: "Settings → Profile → Custom instructions / Styles" },
  { id: "google", label: "Gemini", settingsUrl: "https://gemini.google.com/", settingsLabel: "Gemini → Settings → Saved info / Gems" },
];

/** C-7: plain-language consumer style names, never "brutal" or "unfiltered". */
export const STYLES: { id: DirectiveMode; name: string; blurb: string }[] = [
  { id: "calibrated", name: "Straight talk", blurb: "Direct, no flattery — agrees when you're right, says so when you're not." },
  { id: "brutal", name: "No sugar-coating", blurb: "Leads with the biggest flaw first. Still never insulting." },
  { id: "socratic", name: "Ask me hard questions", blurb: "Questions your assumptions before giving a view." },
  { id: "redteam", name: "What could go wrong?", blurb: "Looks for every way this could fail." },
];

/** C-7 strength options; consumers never see intensity 5 (Builders-only, 6.4). */
export const STRENGTHS: { id: number; name: string }[] = [
  { id: 1, name: "Gentle" },
  { id: 3, name: "Direct" },
  { id: 4, name: "Tough" },
];

/** 6.5 onboarding: one question picks a default style. */
export function defaultStyleFor(usage: "work" | "money" | "writing" | "everyday"): { mode: DirectiveMode; intensity: number } {
  switch (usage) {
    case "work":
      return { mode: "redteam", intensity: 3 };
    case "money":
      return { mode: "calibrated", intensity: 3 };
    case "writing":
      return { mode: "socratic", intensity: 3 };
    case "everyday":
      return { mode: "calibrated", intensity: 1 };
  }
}
