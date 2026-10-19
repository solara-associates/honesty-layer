export const MODES = ["calibrated", "brutal", "socratic", "redteam", "off"] as const;
export type Mode = (typeof MODES)[number];

export function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

export type Intensity = 1 | 2 | 3 | 4 | 5;

export function parseIntensity(value: number): Intensity {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new InvalidIntensityError(value);
  }
  return value as Intensity;
}

export class InvalidIntensityError extends Error {
  constructor(value: number) {
    super(`Intensity must be an integer 1-5, got ${value}`);
    this.name = "InvalidIntensityError";
  }
}

export const MODEL_FAMILIES = ["openai", "anthropic", "google"] as const;
export type ModelFamily = (typeof MODEL_FAMILIES)[number];

export function isModelFamily(value: string): value is ModelFamily {
  return (MODEL_FAMILIES as readonly string[]).includes(value);
}
