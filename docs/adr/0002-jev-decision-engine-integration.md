# ADR-0002: Integrate an open-source Jev-compatible decision server for F-7

## Status

Accepted.

## Context

TypeSafe AI announced "Jev" (15 September 2026): a proprietary "System One"
model that returns typed, calibrated decisions (`noul`/`choice`/`score`
primitives with confidence) instead of free text, in low tens of
milliseconds. It spawned a wave of open-source reproductions within weeks.

A request came in to "integrate open source jev for the decision layer."
The PRD has no component literally named "decision layer"; the closest
matches are F-1 (task classifier) and F-7 (Truth/Logic Evaluator, defined in
v0.2, never implemented — `packages/proxy` shipped it only as "scaffolding").

### Due diligence on the open-source candidates

A web search for "open source jev" returned ~9 repos from unrelated authors
all using near-identical marketing language ("non-autoregressive System One
decision engine," "calibrated," "<35ms"). That pattern alone is a yellow
flag, so each candidate was checked against the GitHub API (stars, commit
history, creation date, license) rather than taken on the README's word:

| Repo | Stars | Created | Notes |
| :- | -: | :- | :- |
| `feder-cr/jev` | 1,363 | **2024-08-15** | Predates the Jev announcement by two years — this is an existing high-star repo rebranded to ride the trend. Its star count isn't honestly earned for this purpose. Excluded. |
| `razorback16/openjev` | 726 | 2026-09-18 (3 days after the announcement) | Real `pyproject.toml`, Docker setup, test suite, active CHANGELOG through mid-October, Apache-2.0. **Chosen.** |
| `Heman10x-NGU/Verdict-open-jev` | 110 | 2026-09-17 | Smaller, real activity, usable as one of openjev's supported backend models. |
| `v-modal/awesome-jev-tools` | 752 | 2026-09-19 | A curated list, not an engine — useful as a meta-reference, nothing to integrate. |
| others | 1–46 | — | Thin, low-activity, not evaluated further. |

`razorback16/openjev` exposes `POST /v1/systemone` (TypeSafe's own wire
format) and also answers OpenAI's Decisions API. It runs several backend
models (DiffusionGemma, Verdict, CLM, JevK5, Clef) and is hostable locally
(MLX on Apple silicon, vLLM on NVIDIA) or via a free hosted tier.

## Decision

Integrate via HTTP against openjev's documented `/v1/systemone` API — not by
vendoring its code. Two integration points, layered per A3:

1. **F-7 Truth/Logic Evaluator** (primary integration) —
   `packages/proxy/src/application/evaluator.ts`. Asks four `noul`
   questions (unsupported claims, logical gaps, missing counter-argument,
   sycophantic framing) and returns a structured `EvaluatorVerdict`. This is
   explicitly async/on-demand per the PRD ("never blocks the main
   response"), so there's no latency-budget conflict.
2. **F-1 task classifier, optional** —
   `packages/proxy/src/infrastructure/jevClassifier.ts`. A `choice` question
   over the five `TaskCategory` values, behind the existing
   `TaskClassifierPort` (this port was designed in the original build
   specifically to allow this swap — see the original code comment: "a
   small local model can be swapped in later"). **Off by default.** Section
   5's input-stage budget is <35ms p95, blocking; a network hop to any Jev
   server will typically exceed that unless self-hosted on the same host/LAN.
   Falls back to the rule-based classifier on any error, timeout, or
   unrecognized response — C-8's crisis/personal-topic detection never
   regresses below the rules-only baseline, even with this enabled.

### Layering

`JevQuestion`/`JevAnswer`/`DecisionServerPort` live in
`packages/proxy/src/domain/decisionServer.ts` (pure types + a port), not in
infrastructure — the application-layer Evaluator depends only on the port,
never on the concrete `JevClient`. `eslint-plugin-boundaries` (A3) catches a
regression here directly: it flagged this exact mistake once during
development (application importing infrastructure) before the port was
extracted.

### Configuration (disabled by default)

- `HONESTY_JEV_BASE_URL` — unset means the feature is off entirely: `/v1/evaluate` returns 503, and F-1 stays rule-based regardless of the next setting.
- `HONESTY_JEV_API_KEY` — optional, forwarded as a bearer token.
- `HONESTY_JEV_MODEL` — defaults to `openjev-latest`.
- `HONESTY_CLASSIFIER_MODE=jev` — opts the blocking F-1 path into the Jev-backed classifier. Do not set this in production without measuring p95 latency against your deployment first.

## Consequences

- A new route, `POST /v1/evaluate`, exists and is actor-authenticated like
  the other routes, but — like them — has no TypeScript entry-point
  classification convention yet (ADR-0010, upstream, still deferred). Noted,
  not solved here.
- No real benchmark numbers are claimed for Jev-assisted classification or
  evaluation; `packages/proxy/test/jev.test.ts` and
  `packages/proxy/test/evaluateRoute.test.ts` test the wiring against a
  scripted fake server, not model judgment quality.
