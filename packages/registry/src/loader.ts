import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { Directive, isMode, isModelFamily, parseIntensity, type Intensity, type Mode, type ModelFamily } from "@honesty/core";

// A5.10 — durable state, declared: the directive set is a versioned,
// read-only file store under directives/, checked into git. The registry
// never writes to it at runtime; new directives are authored and committed,
// then loaded. There is no database here because there is no mutable state.
const DIRECTIVES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "directives");

export class DirectiveNotFoundError extends Error {
  constructor(mode: string, modelFamily: string, intensity: number) {
    super(`No directive for mode="${mode}" modelFamily="${modelFamily}" at or below intensity ${intensity}`);
    this.name = "DirectiveNotFoundError";
  }
}

interface LoadedKey {
  mode: Mode;
  modelFamily: ModelFamily;
  intensity: Intensity;
}

function parseDirectiveFile(path: string): Directive {
  const raw = parse(readFileSync(path, "utf8"));
  if (!isMode(raw.mode)) throw new Error(`Invalid mode in ${path}: ${raw.mode}`);
  if (!isModelFamily(raw.modelFamily)) throw new Error(`Invalid modelFamily in ${path}: ${raw.modelFamily}`);
  return new Directive({
    id: raw.id,
    version: String(raw.version),
    mode: raw.mode,
    intensity: parseIntensity(raw.intensity),
    modelFamily: raw.modelFamily,
    text: raw.text,
  });
}

/**
 * Loads every directive file under directives/<mode>/<modelFamily>/i<n>.yaml
 * once at construction. Directory layout is scanned so the file set is the
 * registry's own ground truth — nothing is hardcoded against it drifting.
 */
export class DirectiveRegistry {
  private readonly byKey = new Map<string, Directive>();

  constructor(root: string = DIRECTIVES_ROOT) {
    for (const modeDir of readdirSync(root, { withFileTypes: true })) {
      if (!modeDir.isDirectory()) continue;
      const modePath = join(root, modeDir.name);
      for (const familyDir of readdirSync(modePath, { withFileTypes: true })) {
        if (!familyDir.isDirectory()) continue;
        const familyPath = join(modePath, familyDir.name);
        for (const file of readdirSync(familyPath)) {
          if (!file.endsWith(".yaml")) continue;
          const directive = parseDirectiveFile(join(familyPath, file));
          this.byKey.set(this.key({ mode: directive.mode, modelFamily: directive.modelFamily, intensity: directive.intensity }), directive);
        }
      }
    }
  }

  private key(k: LoadedKey): string {
    return `${k.mode}:${k.modelFamily}:${k.intensity}`;
  }

  /**
   * Looks up the exact (mode, modelFamily, intensity). If that exact
   * intensity was never authored/tested, falls back to the nearest *lower*
   * tested intensity for the same mode and model — never a higher one, so a
   * missing exhaustive-critique variant can never silently apply untested
   * exhaustive text. Throws (fail closed, A5.7) if nothing is found at or
   * below the requested intensity.
   */
  get(mode: Mode, modelFamily: ModelFamily, intensity: Intensity): { directive: Directive; substituted: boolean } {
    const exact = this.byKey.get(this.key({ mode, modelFamily, intensity }));
    if (exact) return { directive: exact, substituted: false };

    for (let i = intensity - 1; i >= 1; i--) {
      const fallback = this.byKey.get(this.key({ mode, modelFamily, intensity: i as Intensity }));
      if (fallback) return { directive: fallback, substituted: true };
    }
    throw new DirectiveNotFoundError(mode, modelFamily, intensity);
  }

  list(): readonly Directive[] {
    return Array.from(this.byKey.values());
  }
}
