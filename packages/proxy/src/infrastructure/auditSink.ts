import type { AuditEvent, AuditSink } from "@honesty/core";

/**
 * A7.audit-chain — single-sourced and durable: every audit write in this
 * process goes through exactly this sink. Today it writes append-only
 * newline-delimited JSON to stdout for the surrounding platform to collect;
 * swapping the transport (file, queue) means changing this one class, not
 * every call site. Metadata only — never prompt content (A7.no-content-in-telemetry).
 */
export class StdoutAuditSink implements AuditSink {
  async record(event: AuditEvent): Promise<void> {
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
