# Honesty Layer

Implementation of `honesty_layer_PRD_v0.3.docx` — calibrated, non-sycophantic
feedback across Honesty Layer for People (consumer) and Honesty Layer for
Builders (API proxy), on one shared core.

## What's here and working

| Package | PRD ref | What it is |
| :- | :- | :- |
| `packages/core` | Appendix B, F-5, F-6 | Domain types: `Directive`, `Actor`, `TaskClassification`, `AuditEvent`, sycophancy detector heuristics, pushback-stability heuristics. Pure, no I/O. |
| `packages/registry` | F-8 | Directive Registry v0 — versioned directive files per mode × model family × intensity, with fail-closed fallback (nearest lower tested intensity, never higher). Also the C-8 wellbeing safeguard and the F-1 rule-based task classifier. |
| `packages/benchmark` | F-9, Section 9, Section 10 | The two-sided benchmark harness: false-premise rejection, true-premise acceptance, pushback flip rate, evidence-based update rate, feedback calibration, tone, task quality. Computes the Calibration Score and the release gates from Section 9/12 (R-3). Ships a `--mock` CLI mode against a deterministic stand-in responder — **never a substitute for a real model run**; mock results are tagged `mock: true` everywhere. |
| `packages/proxy` | F-3, F-1, F-5, F-6, F-7 | The OpenAI- and Anthropic-compatible proxy. Header-driven mode/intensity/version pinning, BYOK passthrough, zero body logging, fail-open on injection failure, fail-closed actor identity and crisis passthrough. Layered domain/application/infrastructure/presentation (A3). F-7 (Truth/Logic Evaluator) and an optional F-1 classifier are backed by an open-source Jev-compatible decision server — off by default, see [ADR-0002](docs/adr/0002-jev-decision-engine-integration.md) and `packages/proxy/README.md`. |
| `packages/extension` | F-2, C-2 | Manifest V3 browser extension for claude.ai and chatgpt.com: toggle/mode popup, diff drawer, per-site health check + kill switch, output sycophancy flags with "Challenge this." |
| `apps/web-setup` | C-1 | The Honesty Setup wizard — pick apps, pick a style, get the tested per-model instruction text to paste into native custom instructions. No install required. |
| `packages/mobile-shared` | C-3, C-4, C-5, C-6 | Shared business logic for the keyboard snippets, Second Opinion prompt/scoring, Decision Check/Journal, and the Flattery Meter/weekly recap — plus a thin client for calling the real proxy. |

Run `npm install && npm run build && npm test` at the repo root to build and
test everything (60 tests across 7 workspaces as of this writing).

## What's explicitly not here

- **Native iOS/Android apps.** The Honesty Keyboard (C-3) and the Second
  Opinion mobile app (C-4) need Xcode/Android Studio, signing certificates,
  and App Store/Play Console accounts this environment doesn't have.
  `packages/mobile-shared` is the business logic a native shell would call;
  no Xcode or Android Studio project is included, and none should be assumed
  to exist until someone builds and runs one.
- **App Store / Play Store / Chrome Web Store submission**, legal review of
  platform terms (Risk R-1), and the Phase 0 user interviews — these are
  business/legal/research processes, not code.
- **A real benchmark run against live ChatGPT/Claude/Gemini.** The harness is
  real and tested against a deterministic mock responder; running it for
  real requires provider credentials and is a deliberate, separate step
  (`packages/benchmark/src/ports.ts` documents the `ModelResponder`
  interface to implement).
- **Gemini in the extension.** Per PRD 5.1, Gemini is "V1.1" for the
  extension; the Directive Registry and the web Setup wizard do cover it.

## Architecture

TypeScript monorepo (npm workspaces). Every service-shaped package
(`proxy`) follows domain ← application ← infrastructure/presentation
(enforced by `eslint-plugin-boundaries`, see `eslint.config.js`). The
Directive Registry is the one place directive text lives; nothing else
duplicates it — the extension and web-setup app each bundle a generated
copy of the registry's YAML files for their own runtime (browser/static
site, no filesystem access), not a hand-maintained duplicate.

See `docs/adr/` for recorded decisions, including why the proxy's
documented fail-open availability behaviour (PRD Section 8) does not
conflict with the architectural rules' fail-closed requirement for
security controls.

## Architectural Rules compliance

This repo was built against Architectural Rules v7. All 8 currently
mechanically-enforced gates pass or have no applicable subjects:
`A2` (regions), `A3` (layer direction, via `eslint-plugin-boundaries`),
`A5.12` (no fire-and-forget), `A6.prompts` (directives are versioned files,
not inline strings), `A7.supply-chain` (lockfile committed, CI runs
`npm audit` + SBOM generation). `A5.10`, `A7.actor`, and `A7.waiver-expiry`
report "no subjects" — not a pass, just nothing of that shape to check yet.
The repo has not opted in to the Stop-gate (`bootstrap_config.py`) — that's
a decision for whoever owns this repo day to day, not made here.
