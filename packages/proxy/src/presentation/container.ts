import { DirectiveRegistry, RuleBasedTaskClassifier } from "@honesty/registry";
import { InjectionService } from "../application/injectionService.js";
import { TruthLogicEvaluator } from "../application/evaluator.js";
import { StdoutAuditSink } from "../infrastructure/auditSink.js";
import { UpstreamClient, defaultAnthropicBaseUrl, defaultOpenAiBaseUrl } from "../infrastructure/upstream.js";
import { JevClient } from "../infrastructure/jevClient.js";
import { JevTaskClassifier } from "../infrastructure/jevClassifier.js";

/**
 * F-7 / optional F-1: a Jev-compatible decision server (default: unset,
 * feature disabled). HONESTY_CLASSIFIER_MODE=jev opts in to using it as the
 * blocking F-1 classifier too — see JevTaskClassifier's latency caveat
 * before setting that in production.
 */
function buildJevClient(): JevClient | null {
  const baseUrl = process.env.HONESTY_JEV_BASE_URL;
  if (!baseUrl) return null;
  return new JevClient({ baseUrl, apiKey: process.env.HONESTY_JEV_API_KEY, model: process.env.HONESTY_JEV_MODEL });
}

/** Composition root. Nothing here is business logic — it only wires ports to implementations (A5.1). */
export function buildContainer() {
  const registry = new DirectiveRegistry();
  const ruleBasedClassifier = new RuleBasedTaskClassifier();
  const auditSink = new StdoutAuditSink();

  const jevClient = buildJevClient();
  const classifier =
    jevClient && process.env.HONESTY_CLASSIFIER_MODE === "jev" ? new JevTaskClassifier(jevClient, ruleBasedClassifier) : ruleBasedClassifier;

  const injectionService = new InjectionService(registry, classifier, auditSink);
  const evaluator = jevClient ? new TruthLogicEvaluator(jevClient) : null;

  const openAiUpstream = new UpstreamClient("openai", defaultOpenAiBaseUrl());
  const anthropicUpstream = new UpstreamClient("anthropic", defaultAnthropicBaseUrl());

  return { injectionService, evaluator, openAiUpstream, anthropicUpstream, auditSink };
}

export type Container = ReturnType<typeof buildContainer>;
