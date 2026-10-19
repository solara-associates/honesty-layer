import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startFakeUpstream } from "./fakeUpstream.js";

let fakeServer: Server;
let fakeUrl: string;
let receivedBodies: unknown[];

beforeAll(async () => {
  const fake = await startFakeUpstream();
  fakeServer = fake.server;
  fakeUrl = fake.url;
  receivedBodies = fake.receivedBodies;
  process.env.HONESTY_OPENAI_BASE_URL = fakeUrl;
  process.env.HONESTY_ANTHROPIC_BASE_URL = fakeUrl;
});

afterAll(() => {
  fakeServer.close();
});

// Imported after env vars are set, since UpstreamClient reads them at construction time.
const { buildServer } = await import("../src/server.js");

describe("proxy /v1/chat/completions (A8.client-test)", () => {
  it("rejects a request with no actor identity (A7.actor, fail closed)", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: { messages: [{ role: "user", content: "hello" }] },
    });
    expect(res.statusCode).toBe(401);
  });

  it("injects the calibrated directive for an evaluative prompt and sets response headers", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { "x-honesty-team-id": "team-1", "x-honesty-mode": "calibrated", "x-honesty-intensity": "3" },
      payload: {
        messages: [
          {
            role: "user",
            content: "Critique my plan: charge customers monthly but let them cancel any time with no notice period.",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-honesty-applied"]).toBe("true");
    expect(res.headers["x-honesty-directive-id"]).toMatch(/^calibrated:openai:i3@/);

    const last = receivedBodies.at(-1) as { messages: { role: string; content: string }[] };
    const systemMessage = last.messages.find((m) => m.role === "system");
    expect(systemMessage?.content).toContain("Skip compliments");
  });

  it("skips injection entirely for a crisis-classified message (C-8 crisis passthrough)", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { "x-honesty-team-id": "team-1", "x-honesty-mode": "calibrated" },
      payload: { messages: [{ role: "user", content: "I want to end my life, I don't see a way out." }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-honesty-applied"]).toBe("false");
    const last = receivedBodies.at(-1) as { messages: { role: string }[] };
    expect(last.messages.some((m) => m.role === "system")).toBe(false);
  });

  it("forwards unmodified when mode=off", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { "x-honesty-team-id": "team-1", "x-honesty-mode": "off" },
      payload: { messages: [{ role: "user", content: "Is this a good idea?" }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-honesty-applied"]).toBe("false");
  });
});

describe("proxy /v1/messages (Anthropic passthrough)", () => {
  it("merges the directive into the top-level system field", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { "x-honesty-team-id": "team-1", "x-honesty-mode": "redteam", "x-honesty-intensity": "3" },
      payload: { messages: [{ role: "user", content: "Red-team this auth flow for security gaps." }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-honesty-directive-id"]).toMatch(/^redteam:anthropic:i3@/);

    const last = receivedBodies.at(-1) as { system: string };
    expect(last.system).toContain("red-team auditor");
  });
});
