import { isMode, parseIntensity } from "@honesty/core";
import { HonestyRequestConfig, InvalidRequestConfigError } from "../domain/requestConfig.js";

/** F-3: X-Honesty-Mode | X-Honesty-Intensity | X-Honesty-Directive-Version. */
export function parseHonestyHeaders(headers: { get(name: string): string | null }): HonestyRequestConfig {
  const modeRaw = headers.get("x-honesty-mode") ?? "calibrated";
  if (!isMode(modeRaw)) {
    throw new InvalidRequestConfigError(`Invalid X-Honesty-Mode: "${modeRaw}"`);
  }

  const intensityRaw = headers.get("x-honesty-intensity");
  const intensity = parseIntensity(intensityRaw ? Number(intensityRaw) : 3);

  const pinnedDirectiveVersion = headers.get("x-honesty-directive-version") ?? undefined;

  return new HonestyRequestConfig({ mode: modeRaw, intensity, pinnedDirectiveVersion });
}
