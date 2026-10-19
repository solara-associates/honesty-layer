import { CircuitBreaker } from "./circuitBreaker.js";

export interface UpstreamResponse {
  status: number;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
}

/**
 * BYOK passthrough (F-3): the caller's Authorization/x-api-key header is
 * forwarded as-is and never written to disk, logged, or stored (NFR: key
 * handling). This client holds no provider credentials of its own.
 */
export class UpstreamClient {
  private readonly circuit: CircuitBreaker;

  constructor(
    private readonly name: string,
    private readonly baseUrl: string
  ) {
    this.circuit = new CircuitBreaker(name);
  }

  async forward(path: string, init: { method: string; headers: Headers; body: BodyInit | null }, timeoutMs: number): Promise<UpstreamResponse> {
    const response = await this.circuit.call(
      (signal) =>
        fetch(new URL(path, this.baseUrl), {
          method: init.method,
          headers: init.headers,
          body: init.body,
          // @ts-expect-error Node's fetch requires this for streamed request bodies
          duplex: init.body ? "half" : undefined,
          signal,
        }),
      timeoutMs
    );
    return { status: response.status, headers: response.headers, body: response.body };
  }
}

export function defaultOpenAiBaseUrl(): string {
  return process.env.HONESTY_OPENAI_BASE_URL ?? "https://api.openai.com";
}

export function defaultAnthropicBaseUrl(): string {
  return process.env.HONESTY_ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
}
