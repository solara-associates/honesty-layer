/**
 * Thin client for a native app (or any JS runtime with fetch) to call the
 * real Honesty proxy (packages/proxy). Not a native app itself — see this
 * package's README for what is and is not shipped here.
 */
export interface ProxyCallParams {
  baseUrl: string;
  /** Issued by the proxy's own team registry (see packages/proxy/scripts/create-team.mjs) — never a self-asserted team id. */
  honestyApiKey: string;
  mode: "calibrated" | "brutal" | "socratic" | "redteam" | "off";
  intensity: 1 | 2 | 3 | 4 | 5;
  providerApiKey: string;
  systemDirectiveOverride?: string;
  userMessage: string;
  timeoutMs?: number;
}

export class ProxyCallError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ProxyCallError";
  }
}

export async function callHonestyProxy(params: ProxyCallParams): Promise<{ content: string; appliedDirectiveId: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs ?? 10_000);

  try {
    const messages = params.systemDirectiveOverride
      ? [
          { role: "system", content: params.systemDirectiveOverride },
          { role: "user", content: params.userMessage },
        ]
      : [{ role: "user", content: params.userMessage }];

    const response = await fetch(`${params.baseUrl}/v1/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${params.providerApiKey}`,
        "x-honesty-api-key": params.honestyApiKey,
        "x-honesty-mode": params.mode,
        "x-honesty-intensity": String(params.intensity),
      },
      body: JSON.stringify({ model: "gpt-4o-mini", messages }),
    });

    if (!response.ok) {
      throw new ProxyCallError(`Proxy returned ${response.status}`, response.status);
    }

    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content ?? "";
    return { content, appliedDirectiveId: response.headers.get("x-honesty-directive-id") };
  } finally {
    clearTimeout(timer);
  }
}
