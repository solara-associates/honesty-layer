/**
 * Translating a directive into each provider's request shape (Section 5.2:
 * "API format differences"). Pure, no I/O — application-layer logic, not
 * infrastructure, so it's testable without a network call.
 */

export interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: unknown;
}

export function lastUserMessageText(messages: OpenAiMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user" && typeof m.content === "string") return m.content;
  }
  return "";
}

/** Appends/merges the directive into the OpenAI `messages` array's system slot, stable prefix-first for prompt caching (5.2). */
export function injectIntoOpenAiBody(body: Record<string, unknown>, directiveText: string): Record<string, unknown> {
  if (!directiveText) return body;
  const messages = Array.isArray(body.messages) ? [...(body.messages as OpenAiMessage[])] : [];
  const existingSystemIndex = messages.findIndex((m) => m.role === "system");

  if (existingSystemIndex >= 0) {
    const existing = messages[existingSystemIndex]!;
    const existingText = typeof existing.content === "string" ? existing.content : "";
    messages[existingSystemIndex] = { role: "system", content: `${existingText}\n\n${directiveText}`.trim() };
  } else {
    messages.unshift({ role: "system", content: directiveText });
  }

  return { ...body, messages };
}

export function anthropicUserText(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as { role?: string; content?: unknown };
    if (m?.role === "user") {
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) {
        const textBlock = m.content.find((c: { type?: string }) => c?.type === "text") as { text?: string } | undefined;
        if (textBlock?.text) return textBlock.text;
      }
    }
  }
  return "";
}

/** Anthropic Messages API: directive merges into the top-level `system` field (5.2). */
export function injectIntoAnthropicBody(body: Record<string, unknown>, directiveText: string): Record<string, unknown> {
  if (!directiveText) return body;

  if (typeof body.system === "string") {
    return { ...body, system: `${body.system}\n\n${directiveText}`.trim() };
  }
  if (Array.isArray(body.system)) {
    return { ...body, system: [...body.system, { type: "text", text: directiveText }] };
  }
  return { ...body, system: directiveText };
}
