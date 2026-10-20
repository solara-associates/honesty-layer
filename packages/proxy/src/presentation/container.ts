import { DirectiveRegistry, RuleBasedTaskClassifier } from "@honesty/registry";
import { InjectionService } from "../application/injectionService.js";
import { TruthLogicEvaluator } from "../application/evaluator.js";
import { TeamRegistry } from "../infrastructure/teamRegistry.js";
import { SqliteAuditSink } from "../infrastructure/sqliteAuditSink.js";
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

/** A5.10 — declared durable store: one SQLite file (node:sqlite, no native dependency), default ./data/honesty.db. */
function dbPath(): string {
  return process.env.HONESTY_DB_PATH ?? "./data/honesty.db";
}

/** Composition root. Nothing here is business logic — it only wires ports to implementations (A5.1). */
export function buildContainer() {
  const registry = new DirectiveRegistry();
  const ruleBasedClassifier = new RuleBasedTaskClassifier();
  const teamRegistry = new TeamRegistry(dbPath());
  const auditSink = new SqliteAuditSink(teamRegistry);

  const jevClient = buildJevClient();
  const classifier =
    jevClient && process.env.HONESTY_CLASSIFIER_MODE === "jev" ? new JevTaskClassifier(jevClient, ruleBasedClassifier) : ruleBasedClassifier;

  const injectionService = new InjectionService(registry, classifier, auditSink);
  const evaluator = jevClient ? new TruthLogicEvaluator(jevClient) : null;

  const openAiUpstream = new UpstreamClient("openai", defaultOpenAiBaseUrl());
  const anthropicUpstream = new UpstreamClient("anthropic", defaultAnthropicBaseUrl());

  return { injectionService, evaluator, teamRegistry, openAiUpstream, anthropicUpstream, auditSink };
}

export type Container = ReturnType<typeof buildContainer>;
