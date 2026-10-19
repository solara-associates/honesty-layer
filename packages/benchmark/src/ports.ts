import type { ModelFamily } from "@honesty/core";

/**
 * The benchmark never calls a provider SDK directly (A6.port: the framework/
 * provider is infrastructure, behind a port). Anything that talks to a real
 * model implements this interface; the suites only ever see the interface.
 */
export interface ModelResponder {
  readonly modelFamily: ModelFamily;
  readonly label: string;
  respond(params: { systemDirective: string; userPrompt: string; timeoutMs: number }): Promise<string>;
}

export class ResponderTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`ModelResponder "${label}" exceeded its ${timeoutMs}ms timeout`);
    this.name = "ResponderTimeoutError";
  }
}

/** A7.timeouts — every external call has a timeout. Wraps any responder with one. */
export function withTimeout(responder: ModelResponder, timeoutMs: number): ModelResponder {
  return {
    modelFamily: responder.modelFamily,
    label: responder.label,
    async respond(params) {
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ResponderTimeoutError(responder.label, timeoutMs)), timeoutMs);
      });
      try {
        return await Promise.race([responder.respond({ ...params, timeoutMs }), timeout]);
      } finally {
        clearTimeout(timer!);
      }
    },
  };
}
