import type { AuditEvent, AuditSink } from "@honesty/core";
import type { TeamRegistry } from "./teamRegistry.js";

/**
 * A7.audit-chain — single-sourced and durable. Replaces the stdout-only
 * sink: the audit trail now survives a process restart (fragility #2).
 * Still prints a line to stdout too, for operational tailing — durability
 * and visibility aren't mutually exclusive. Metadata only, never prompt
 * content (A7.no-content-in-telemetry) — unchanged from before.
 */
export class SqliteAuditSink implements AuditSink {
  constructor(private readonly registry: TeamRegistry) {}

  async record(event: AuditEvent): Promise<void> {
    this.registry.recordAuditEvent({
      type: event.type,
      actorId: event.actor.id,
      actorKind: event.actor.kind,
      occurredAt: event.occurredAt.toISOString(),
      metadata: event.metadata,
    });
    process.stdout.write(
      JSON.stringify({
        auditType: event.type,
        actorId: event.actor.id,
        actorKind: event.actor.kind,
        occurredAt: event.occurredAt.toISOString(),
        ...event.metadata,
      }) + "\n"
    );
  }
}
