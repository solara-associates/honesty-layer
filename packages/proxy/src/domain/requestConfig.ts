import type { Intensity, Mode } from "@honesty/core";

export class InvalidRequestConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestConfigError";
  }
}

/** F-3: header-driven configuration, parsed once into an immutable value object. */
export class HonestyRequestConfig {
  readonly mode: Mode;
  readonly intensity: Intensity;
  readonly pinnedDirectiveVersion: string | undefined;

  constructor(params: { mode: Mode; intensity: Intensity; pinnedDirectiveVersion?: string }) {
    this.mode = params.mode;
    this.intensity = params.intensity;
    this.pinnedDirectiveVersion = params.pinnedDirectiveVersion;
    Object.freeze(this);
  }
}

