import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startFakeJevServer, type FakeJevRequest } from "./fakeJevServer.js";
import { JevClient, JevUnavailableError } from "../src/infrastructure/jevClient.js";
import { TruthLogicEvaluator } from "../src/application/evaluator.js";
import { JevTaskClassifier } from "../src/infrastructure/jevClassifier.js";
import { RuleBasedTaskClassifier } from "@honesty/registry";

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

describe("JevClient", () => {
  it("sends state/model/questions and returns the answers", async () => {
    const fake = await startFakeJevServer((req) => {
      expect(req.model).toBe("openjev-latest");
      expect(req.questions).toHaveProperty("urgent");
      return { urgent: { noul: 0.9 } };
    });
    server = fake.server;

    const client = new JevClient({ baseUrl: fake.url });
    const answers = await client.ask("help, everything is down", { urgent: { type: "noul", instructions: "Is this urgent?" } });
    expect(answers.urgent).toEqual({ noul: 0.9 });
  });

  it("wraps a connection failure in JevUnavailableError rather than throwing raw", async () => {
    const client = new JevClient({ baseUrl: "http://127.0.0.1:1", timeoutMs: 500 });
    await expect(client.ask("x", { q: { type: "noul", instructions: "?" } })).rejects.toThrow(JevUnavailableError);
  });
});

describe("TruthLogicEvaluator (F-7)", () => {
  it("maps noul answers to the structured verdict", async () => {
    const fake = await startFakeJevServer(() => ({
      unsupported_claims: { noul: 0.8 },
      logical_gaps: { noul: 0.1 },
      missing_counter_argument: { noul: 0.6 },
      sycophantic_framing: { noul: 0.95 },
    }));
    server = fake.server;

    const evaluator = new TruthLogicEvaluator(new JevClient({ baseUrl: fake.url }));
    const verdict = await evaluator.evaluate("Great idea! You're totally right, this will definitely work.");

    expect(verdict.hasUnsupportedClaims).toBe(true);
    expect(verdict.hasLogicalGaps).toBe(false);
    expect(verdict.isMissingCounterArgument).toBe(true);
    expect(verdict.isSycophanticFraming).toBe(true);
    expect(verdict.overallConfidence).toBeGreaterThan(0);
  });
});

describe("JevTaskClassifier (optional F-1)", () => {
  it("uses the server's choice when it returns a recognized category", async () => {
    const fake = await startFakeJevServer(() => ({ category: { choice: "evaluative", probabilities: { evaluative: 0.9 }, confidence: 0.9 } }));
    server = fake.server;

    const classifier = new JevTaskClassifier(new JevClient({ baseUrl: fake.url }), new RuleBasedTaskClassifier());
    const classification = await classifier.classify("Is this a good plan?");
    expect(classification.category).toBe("evaluative");
  });

  it("falls back to the rule-based classifier when the server returns an unrecognized category", async () => {
    const fake = await startFakeJevServer(() => ({ category: { choice: "not_a_real_category", probabilities: {}, confidence: 0.5 } }));
    server = fake.server;

    const classifier = new JevTaskClassifier(new JevClient({ baseUrl: fake.url }), new RuleBasedTaskClassifier());
    const classification = await classifier.classify("translate this into French");
    expect(classification.category).toBe("mechanical"); // rule-based fallback result for this input
  });

  it("falls back to the rule-based classifier when the server is unreachable", async () => {
    const classifier = new JevTaskClassifier(new JevClient({ baseUrl: "http://127.0.0.1:1", timeoutMs: 300 }), new RuleBasedTaskClassifier());
    const classification = await classifier.classify("I want to end my life");
    expect(classification.category).toBe("crisis"); // C-8 safety net must survive Jev being down
  });
});
