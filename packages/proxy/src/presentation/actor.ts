import { Actor, InvalidActorError } from "@honesty/core";
import type { TeamRegistry } from "../infrastructure/teamRegistry.js";

/**
 * A7.actor — actor identity is passed explicitly, never inferred, and now
 * (fixing fragility #1) never self-asserted either: X-Honesty-Team-Id used
 * to be trusted as-is, which let any caller claim to be any team. The only
 * path to an Actor is now a verified API key, issued by this proxy's own
 * team registry — not the BYOK Authorization/x-api-key header, which stays
 * a pure passthrough to the upstream provider and proves nothing to us.
 */
export function extractActor(registry: TeamRegistry, headers: { get(name: string): string | null }): Actor {
  const apiKey = headers.get("x-honesty-api-key");
  if (!apiKey || !apiKey.trim()) {
    throw new InvalidActorError('Missing required "X-Honesty-Api-Key" header; actor identity cannot be inferred or self-asserted.');
  }
  const actor = registry.verifyApiKey(apiKey.trim());
  if (!actor) {
    throw new InvalidActorError("X-Honesty-Api-Key is not a recognized, active key.");
  }
  return actor;
}
