import { Actor, InvalidActorError } from "@honesty/core";

/**
 * A7.actor — actor identity is passed explicitly, never inferred. The proxy
 * requires a team identifier header on every request; there is no default
 * actor and no "anonymous" fallback. A request missing it is rejected before
 * any domain logic runs (fail closed).
 */
export function extractActor(headers: { get(name: string): string | null }): Actor {
  const teamId = headers.get("x-honesty-team-id");
  if (!teamId || !teamId.trim()) {
    throw new InvalidActorError('Missing required "X-Honesty-Team-Id" header; actor identity cannot be inferred.');
  }
  return new Actor({ id: teamId, kind: "team" });
}
