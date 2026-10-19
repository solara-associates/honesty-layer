import type { Actor } from "./actor.js";

export const AUDIT_EVENT_TYPES = [
  "directive_applied",
  "directive_skipped_crisis",
  "directive_skipped_mechanical",
  "fail_open_triggered",
  "health_check_disabled_site",
  "challenge_requested",
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

/**
 * Every write emits an audit event (A7.audit-event). Carries metadata only —
 * never prompt content or model output (A7.no-content-in-telemetry).
 */
export class AuditEvent {
  readonly type: AuditEventType;
  readonly actor: Actor;
  readonly occurredAt: Date;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;

  constructor(params: {
    type: AuditEventType;
    actor: Actor;
    occurredAt?: Date;
    metadata?: Record<string, string | number | boolean>;
  }) {
    this.type = params.type;
    this.actor = params.actor;
    this.occurredAt = params.occurredAt ?? new Date();
    this.metadata = Object.freeze({ ...(params.metadata ?? {}) });
    Object.freeze(this);
  }
}

/** Audit chain is single-sourced and durable (A7.audit-chain): one append-only sink. */
export interface AuditSink {
  record(event: AuditEvent): Promise<void>;
}
