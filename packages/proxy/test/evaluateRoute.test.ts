import type { Server } from "node:http";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { startFakeJevServer } from "./fakeJevServer.js";
import { buildServer } from "../src/server.js";

let jevServer: Server | undefined;

beforeAll(() => {
  delete process.env.HONESTY_JEV_BASE_URL;
});

afterEach(() => {
  jevServer?.close();
  jevServer = undefined;
  delete process.env.HONESTY_JEV_BASE_URL;
});

describe("POST /v1/evaluate (F-7 Truth/Logic Evaluator)", () => {
  it("returns 503 when no Jev server is configured, rather than fabricating a verdict", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-honesty-team-id": "team-1" },
      payload: { responseText: "You're totally right, great idea!" },
    });
    expect(res.statusCode).toBe(503);
  });

  it("rejects with no actor identity before touching the evaluator", async () => {
    const app = buildServer();
    const res = await app.inject({ method: "POST", url: "/v1/evaluate", payload: { responseText: "hello" } });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a missing responseText field", async () => {
    const fake = await startFakeJevServer(() => ({ unsupported_claims: { noul: 0 } }));
    jevServer = fake.server;
    process.env.HONESTY_JEV_BASE_URL = fake.url;

    const app = buildServer();
    const res = await app.inject({ method: "POST", url: "/v1/evaluate", headers: { "x-honesty-team-id": "team-1" }, payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it("returns a structured verdict when a Jev server is configured", async () => {
    const fake = await startFakeJevServer(() => ({
      unsupported_claims: { noul: 0.9 },
      logical_gaps: { noul: 0.2 },
      missing_counter_argument: { noul: 0.1 },
      sycophantic_framing: { noul: 0.85 },
    }));
    jevServer = fake.server;
    process.env.HONESTY_JEV_BASE_URL = fake.url;

    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-honesty-team-id": "team-1" },
      payload: { responseText: "Great idea! You're totally right." },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.hasUnsupportedClaims).toBe(true);
    expect(body.isSycophanticFraming).toBe(true);
  });
});
