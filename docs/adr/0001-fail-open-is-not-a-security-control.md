# ADR-0001: The proxy's fail-open path does not conflict with A5.7

## Status

Accepted.

## Context

PRD Section 8 (Non-Functional Requirements) requires: "Availability: 99.9%
monthly uptime for the hosted proxy, with a documented fail-open option
(requests go direct to provider if the layer is down)."

Architectural Rules A5.7 requires: "Controls fail closed" — an enforcement,
auth, or containment path must raise, never return success, on failure.

Read naively, these look contradictory: one says "fail open," the other says
"fail closed."

## Decision

They are not in conflict because they govern different things:

- **Directive injection** (the honesty-layer feature itself) is a product
  feature, not a security or containment control. If classification,
  registry lookup, or injection throws, `packages/proxy/src/presentation/routes.ts`
  catches it, logs a `fail_open_triggered` audit event, and forwards the
  request to the provider unmodified. This is PRD-compliant fail-open
  behaviour and does not touch A5.7.
- **Actor identity** (`packages/proxy/src/presentation/actor.ts`) and the
  **C-8 crisis passthrough** safeguard remain fail-closed: a missing actor
  header is rejected (401) before any domain logic runs, and a crisis
  classification always suppresses the directive rather than ever risking
  one being force-applied on a false negative.

PRD wins on the availability behaviour for the feature; A5.7 wins
unconditionally on the security boundary (actor identity) and the safety
boundary (crisis passthrough). No PRD language needed to change.

## Consequences

A future reviewer who sees `catch { failedOpen = true }` in the OpenAI/
Anthropic route handlers should check this ADR before flagging it as an
A5.7 violation — it is deliberate, scoped to the feature path only, and the
two fail-closed boundaries sit outside that `catch`.
