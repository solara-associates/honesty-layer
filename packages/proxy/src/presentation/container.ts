import { DirectiveRegistry, RuleBasedTaskClassifier } from "@honesty/registry";
import { InjectionService } from "../application/injectionService.js";
import { StdoutAuditSink } from "../infrastructure/auditSink.js";
import { UpstreamClient, defaultAnthropicBaseUrl, defaultOpenAiBaseUrl } from "../infrastructure/upstream.js";

/** Composition root. Nothing here is business logic — it only wires ports to implementations (A5.1). */
export function buildContainer() {
  const registry = new DirectiveRegistry();
  const classifier = new RuleBasedTaskClassifier();
  const auditSink = new StdoutAuditSink();
  const injectionService = new InjectionService(registry, classifier, auditSink);

  const openAiUpstream = new UpstreamClient("openai", defaultOpenAiBaseUrl());
  const anthropicUpstream = new UpstreamClient("anthropic", defaultAnthropicBaseUrl());

  return { injectionService, openAiUpstream, anthropicUpstream, auditSink };
}

export type Container = ReturnType<typeof buildContainer>;
