import type { DecisionServerPort, JevAnswer, JevQuestion } from "../domain/decisionServer.js";
import { CircuitBreaker } from "./circuitBreaker.js";

/**
 * Client for a Jev-compatible "System One" decision server (TypeSafe AI's
 * Jev, or an open-source reproduction such as razorback16/openjev). Wire
 * format: POST {state, model, questions} -> {model, answers, usage}.
 * https://github.com/razorback16/openjev (Apache-2.0) documents the exact
 * shape this client targets; this is an HTTP client against that documented
 * API, not a vendored copy of their code.
 */
export class JevUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`Jev-compatible decision server unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "JevUnavailableError";
  }
}

export interface JevClientConfig {
  baseUrl: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export class JevClient implements DecisionServerPort {
  private readonly circuit = new CircuitBreaker("jev");
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: JevClientConfig) {
    this.model = config.model ?? "openjev-latest";
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  /** A7.timeouts / A5.6 — every external call has a timeout and circuit breaker. Never throws a raw network error; always JevUnavailableError. */
  async ask(state: string, questions: Record<string, JevQuestion>): Promise<Record<string, JevAnswer>> {
    try {
      const response = await this.circuit.call(
        (signal) =>
          fetch(new URL("/v1/systemone", this.config.baseUrl), {
            method: "POST",
            signal,
            headers: {
              "content-type": "application/json",
              ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
            },
            body: JSON.stringify({ model: this.model, state, questions }),
          }),
        this.timeoutMs
      );

      if (!response.ok) {
        throw new Error(`Jev server returned ${response.status}`);
      }
      const body = (await response.json()) as { answers: Record<string, JevAnswer> };
      return body.answers;
    } catch (err) {
      throw new JevUnavailableError(err);
    }
  }
}
