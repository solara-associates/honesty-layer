import type { FastifyInstance } from "fastify";
import { AuditEvent, InvalidActorError } from "@honesty/core";
import { InvalidRequestConfigError } from "../domain/requestConfig.js";
import { anthropicUserText, injectIntoAnthropicBody, injectIntoOpenAiBody, lastUserMessageText } from "../application/bodyInjection.js";
import { extractActor } from "./actor.js";
import { parseHonestyHeaders } from "./headers.js";
import type { Container } from "./container.js";

const REQUEST_TIMEOUT_MS = 30_000;

function headerAdapter(raw: Record<string, string | string[] | undefined>) {
  return {
    get(name: string): string | null {
      const v = raw[name.toLowerCase()];
      if (v === undefined) return null;
      return Array.isArray(v) ? (v[0] ?? null) : v;
    },
  };
}

/** @public — Builders call this directly with their own provider key (BYOK); no platform credential is used. */
export function registerRoutes(app: FastifyInstance, container: Container) {
  app.post("/v1/chat/completions", async (request, reply) => {
    const headers = headerAdapter(request.headers as Record<string, string | string[] | undefined>);

    let actor;
    try {
      actor = extractActor(container.teamRegistry, headers);
    } catch (err) {
      if (err instanceof InvalidActorError) return reply.code(401).send({ error: err.message });
      throw err;
    }

    let config;
    try {
      config = parseHonestyHeaders(headers);
    } catch (err) {
      if (err instanceof InvalidRequestConfigError) return reply.code(400).send({ error: err.message });
      throw err;
    }

    const body = request.body as Record<string, unknown>;
    const userText = lastUserMessageText(Array.isArray(body.messages) ? (body.messages as never[]) : []);

    let injected = { directiveText: "", appliedId: null as string | null, skippedReason: null as string | null };
    let failedOpen = false;
    try {
      injected = await container.injectionService.build({ userMessage: userText, config, modelFamily: "openai", actor });
    } catch {
      // NFR (Section 8): documented fail-open. This is an availability
      // behaviour for the injection *feature*, not a security control — the
      // actor check above and the crisis safeguard inside InjectionService
      // already ran or are bypassed safely; here we simply forward the
      // request unmodified rather than failing the user's call.
      failedOpen = true;
      await container.auditSink.record(new AuditEvent({ type: "fail_open_triggered", actor, metadata: { route: "openai" } }));
    }

    const outgoingBody = injected.directiveText ? injectIntoOpenAiBody(body, injected.directiveText) : body;

    const forwardHeaders = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (!value || ["host", "content-length", "x-honesty-api-key", "x-honesty-mode", "x-honesty-intensity", "x-honesty-directive-version"].includes(key)) continue;
      forwardHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    forwardHeaders.set("content-type", "application/json");

    const upstream = await container.openAiUpstream.forward(
      "/v1/chat/completions",
      { method: "POST", headers: forwardHeaders, body: JSON.stringify(outgoingBody) },
      REQUEST_TIMEOUT_MS
    );

    reply.code(upstream.status);
    reply.header("X-Honesty-Applied", String(!failedOpen && injected.appliedId !== null));
    if (injected.appliedId) reply.header("X-Honesty-Directive-Id", injected.appliedId);
    upstream.headers.forEach((value, key) => {
      if (!["content-length", "content-encoding", "transfer-encoding"].includes(key)) reply.header(key, value);
    });
    return reply.send(upstream.body);
  });

  app.post("/v1/messages", async (request, reply) => {
    const headers = headerAdapter(request.headers as Record<string, string | string[] | undefined>);

    let actor;
    try {
      actor = extractActor(container.teamRegistry, headers);
    } catch (err) {
      if (err instanceof InvalidActorError) return reply.code(401).send({ error: err.message });
      throw err;
    }

    let config;
    try {
      config = parseHonestyHeaders(headers);
    } catch (err) {
      if (err instanceof InvalidRequestConfigError) return reply.code(400).send({ error: err.message });
      throw err;
    }

    const body = request.body as Record<string, unknown>;
    const userText = anthropicUserText(body);

    let injected = { directiveText: "", appliedId: null as string | null, skippedReason: null as string | null };
    let failedOpen = false;
    try {
      injected = await container.injectionService.build({ userMessage: userText, config, modelFamily: "anthropic", actor });
    } catch {
      failedOpen = true;
      await container.auditSink.record(new AuditEvent({ type: "fail_open_triggered", actor, metadata: { route: "anthropic" } }));
    }

    const outgoingBody = injected.directiveText ? injectIntoAnthropicBody(body, injected.directiveText) : body;

    const forwardHeaders = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (!value || ["host", "content-length", "x-honesty-api-key", "x-honesty-mode", "x-honesty-intensity", "x-honesty-directive-version"].includes(key)) continue;
      forwardHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    forwardHeaders.set("content-type", "application/json");

    const upstream = await container.anthropicUpstream.forward(
      "/v1/messages",
      { method: "POST", headers: forwardHeaders, body: JSON.stringify(outgoingBody) },
      REQUEST_TIMEOUT_MS
    );

    reply.code(upstream.status);
    reply.header("X-Honesty-Applied", String(!failedOpen && injected.appliedId !== null));
    if (injected.appliedId) reply.header("X-Honesty-Directive-Id", injected.appliedId);
    upstream.headers.forEach((value, key) => {
      if (!["content-length", "content-encoding", "transfer-encoding"].includes(key)) reply.header(key, value);
    });
    return reply.send(upstream.body);
  });

  // F-7 Truth/Logic Evaluator: on-demand, never on the blocking request path above.
  app.post("/v1/evaluate", async (request, reply) => {
    const headers = headerAdapter(request.headers as Record<string, string | string[] | undefined>);

    try {
      extractActor(container.teamRegistry, headers);
    } catch (err) {
      if (err instanceof InvalidActorError) return reply.code(401).send({ error: err.message });
      throw err;
    }

    if (!container.evaluator) {
      return reply.code(503).send({ error: "Evaluator not configured. Set HONESTY_JEV_BASE_URL to enable F-7." });
    }

    const body = request.body as { responseText?: unknown };
    if (typeof body.responseText !== "string" || !body.responseText.trim()) {
      return reply.code(400).send({ error: "Body must include a non-empty string field 'responseText'." });
    }

    try {
      const verdict = await container.evaluator.evaluate(body.responseText);
      return reply.send(verdict);
    } catch {
      // F-7 never blocks a model response and never fabricates a verdict:
      // if the evaluator call fails, say so rather than guessing (A5.8).
      return reply.code(502).send({ error: "Evaluator call failed; no verdict available." });
    }
  });

  app.get("/healthz", async () => ({ status: "ok" }));
}
