import type { Intensity, Mode, ModelFamily } from "./mode.js";

export class InvalidDirectiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDirectiveError";
  }
}

/**
 * A single versioned directive: the instruction text Honesty Layer adds to a
 * request (Appendix B). Immutable once constructed (A5.3) — a new tuning
 * always produces a new Directive, never a mutation of an existing one.
 */
export class Directive {
  readonly id: string;
  readonly version: string;
  readonly mode: Mode;
  readonly intensity: Intensity;
  readonly modelFamily: ModelFamily;
  readonly text: string;

  constructor(params: {
    id: string;
    version: string;
    mode: Mode;
    intensity: Intensity;
    modelFamily: ModelFamily;
    text: string;
  }) {
    if (!params.id.trim()) throw new InvalidDirectiveError("Directive id must not be empty");
    if (!/^\d{4}-\d{2}-\d{2}(\.\d+)?$/.test(params.version) && !/^v\d+(\.\d+)*$/.test(params.version)) {
      throw new InvalidDirectiveError(`Directive version must be dated (YYYY-MM-DD) or semantic (vX.Y): got "${params.version}"`);
    }
    if (params.mode === "off") {
      if (params.text.trim().length > 0) {
        throw new InvalidDirectiveError('Mode "off" must carry empty-effect directive text, not free text');
      }
    } else if (!params.text.trim()) {
      throw new InvalidDirectiveError("Directive text must not be empty");
    }

    this.id = params.id;
    this.version = params.version;
    this.mode = params.mode;
    this.intensity = params.intensity;
    this.modelFamily = params.modelFamily;
    this.text = params.text;
    Object.freeze(this);
  }

  /** Stable identifier surfaced in the X-Honesty-Directive-Id response header (F-3). */
  get appliedId(): string {
    return `${this.mode}:${this.modelFamily}:i${this.intensity}@${this.version}`;
  }
}
