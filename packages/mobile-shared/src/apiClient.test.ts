import { afterEach, describe, expect, it, vi } from "vitest";
import { callHonestyProxy, ProxyCallError } from "./apiClient.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callHonestyProxy", () => {
  it("sends the verified honesty API key, never a self-asserted team id", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedHeaders = init.headers as Record<string, string>;
        return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
          status: 200,
          headers: { "x-honesty-directive-id": "calibrated:openai:i3@2026-10-19" },
        });
      })
    );

    const result = await callHonestyProxy({
      baseUrl: "https://proxy.example.com",
      honestyApiKey: "hl_live_abc123",
      providerApiKey: "sk-provider",
      mode: "calibrated",
      intensity: 3,
      userMessage: "hello",
    });

    expect(capturedHeaders?.["x-honesty-api-key"]).toBe("hl_live_abc123");
    expect(capturedHeaders?.["x-honesty-team-id"]).toBeUndefined();
    expect(result.content).toBe("ok");
    expect(result.appliedDirectiveId).toBe("calibrated:openai:i3@2026-10-19");
  });

  it("throws ProxyCallError with the status on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 401 }))
    );

    await expect(
      callHonestyProxy({
        baseUrl: "https://proxy.example.com",
        honestyApiKey: "bad-key",
        providerApiKey: "sk-provider",
        mode: "calibrated",
        intensity: 3,
        userMessage: "hello",
      })
    ).rejects.toThrow(ProxyCallError);
  });
});
