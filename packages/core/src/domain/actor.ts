/**
 * Actor identity (A7.actor): every handler, route, and MCP tool takes an
 * explicit Actor. Never inferred from a session, a connection, or a default.
 * Callers that cannot produce one must fail closed before reaching domain code.
 */
export type ActorKind = "consumer_user" | "team" | "service";

export class InvalidActorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidActorError";
  }
}

export class Actor {
  readonly id: string;
  readonly kind: ActorKind;

  constructor(params: { id: string; kind: ActorKind }) {
    if (!params.id.trim()) throw new InvalidActorError("Actor id must not be empty");
    this.id = params.id;
    this.kind = params.kind;
    Object.freeze(this);
  }

  static anonymous(): never {
    throw new InvalidActorError("Actor identity is required and must not be inferred as anonymous");
  }
}
