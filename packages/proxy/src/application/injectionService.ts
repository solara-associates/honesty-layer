import { Actor, AuditEvent, type AuditSink, type ModelFamily } from "@honesty/core";
import { applyWellbeingSafeguard, DirectiveRegistry } from "@honesty/registry";
import type { HonestyRequestConfig } from "../domain/requestConfig.js";
import type { TaskClassifierPort } from "./ports.js";

export interface InjectionResult {
  /** Empty string means "inject nothing" (off, crisis passthrough, or mechanical skip). */
  directiveText: string;
  appliedId: string | null;
  skippedReason: "crisis_passthrough" | "mechanical_task" | "mode_off" | null;
}

/**
 * F-1 input stage, application layer: classify -> wellbeing safeguard ->
 * registry lookup -> injectable text. No I/O to a provider here — that is
 * infrastructure's job. < 35ms p95 budget (Section 5): everything here is
 * synchronous in-process work over an already-loaded registry.
 */
export class InjectionService {
  constructor(
    private readonly registry: DirectiveRegistry,
    private readonly classifier: TaskClassifierPort,
    private readonly auditSink: AuditSink
  ) {}

  async build(params: { userMessage: string; config: HonestyRequestConfig; modelFamily: ModelFamily; actor: Actor }): Promise<InjectionResult> {
    if (params.config.mode === "off") {
      return { directiveText: "", appliedId: null, skippedReason: "mode_off" };
    }

    const classification = this.classifier.classify(params.userMessage);

    if (classification.isCrisis) {
      await this.auditSink.record(
        new AuditEvent({ type: "directive_skipped_crisis", actor: params.actor, metadata: { modelFamily: params.modelFamily } })
      );
      return { directiveText: "", appliedId: null, skippedReason: "crisis_passthrough" };
    }

    if (classification.skipsCritique) {
      await this.auditSink.record(
        new AuditEvent({ type: "directive_skipped_mechanical", actor: params.actor, metadata: { modelFamily: params.modelFamily } })
      );
      return { directiveText: "", appliedId: null, skippedReason: "mechanical_task" };
    }

    const decision = applyWellbeingSafeguard({ mode: params.config.mode, intensity: params.config.intensity }, classification);
    const effective =
      decision.kind === "override"
        ? { mode: decision.mode, intensity: decision.intensity }
        : { mode: params.config.mode, intensity: params.config.intensity };

    if (decision.kind === "no_directive") {
      await this.auditSink.record(
        new AuditEvent({ type: "directive_skipped_crisis", actor: params.actor, metadata: { modelFamily: params.modelFamily } })
      );
      return { directiveText: "", appliedId: null, skippedReason: "crisis_passthrough" };
    }

    const { directive } = this.registry.get(effective.mode, params.modelFamily, effective.intensity);

    await this.auditSink.record(
      new AuditEvent({
        type: "directive_applied",
        actor: params.actor,
        metadata: {
          modelFamily: params.modelFamily,
          directiveId: directive.appliedId,
          wellbeingOverride: decision.kind === "override",
        },
      })
    );

    return { directiveText: directive.text, appliedId: directive.appliedId, skippedReason: null };
  }
}
