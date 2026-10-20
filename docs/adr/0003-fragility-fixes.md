# ADR-0003: Fixing the 5 fragilities from the end-to-end assessment

## Status

Accepted.

## Context

An end-to-end audit of the build (prompted by a request to assess the
solution and propose 5 improvements) found five concrete, cite-backed
fragilities, ranked by severity:

1. **Auth was theater, not authorization.** `extractActor` accepted any
   non-empty `X-Honesty-Team-Id` string — nothing bound it to a real team or
   checked it against anything. Any caller could claim to be any team.
2. **No durable backend existed.** The only persistence anywhere was JSON
   result files and `chrome.storage.local` (extension settings). Nothing
   backed a team/key registry or a queryable audit trail.
3. **The extension's injection mechanism was probabilistic.** The async
   `chrome.storage` read raced the host page's synchronous submit handler —
   a documented, unmitigated bug.
4. **Benchmark grading was brittle keyword-matching.** A response that
   correctly identified a flaw in different words than the planted keyword
   list scored as a miss, undermining the Calibration Score.
5. **C-6 (Flattery Meter / weekly recap) was dead code.** `computeWeeklyRecap`
   was correct and tested but had no producer anywhere in the extension.

## Decision

Fix all five, each with a real implementation and a test that would fail if
the fragility were still present (not just a claim):

| # | Fix | Where | Proof |
| :- | :- | :- | :- |
| 1 | API keys issued by and verified against a real registry; `X-Honesty-Team-Id` removed entirely | `presentation/actor.ts`, `infrastructure/teamRegistry.ts` | `server.test.ts`: unregistered key → 401; `teamRegistry.test.ts`: 7 direct unit tests |
| 2 | SQLite-backed team/key registry + durable audit log (`node:sqlite`, zero native dependency) | `infrastructure/teamRegistry.ts`, `infrastructure/sqliteAuditSink.ts` | `teamRegistry.test.ts`: "persists across separate connections to the same file" |
| 3 | Original send event fully intercepted (`preventDefault`/`stopImmediatePropagation`) before the host sees it; resend happens only after injection completes | `content/content.ts` (`interceptAndResend`) | `content.test.ts`: a simulated host listener only ever observes post-injection text |
| 4 | Optional LLM-judge grading (`judge.ts`) for the three suites that feed the Calibration Score, reusing the existing `ModelResponder` port — falls back to the heuristic grader when no judge is supplied | `judge.ts`, `suites.ts` | `suites.judge.test.ts`: a correctly-paraphrased response scores a miss under the heuristic and a hit under the judge |
| 5 | Real event capture wired into the content script (pushback-outcome tracking + per-message logging) and a visible weekly-recap surface in the popup | `content/content.ts`, `shared/weeklyEvents.ts`, `popup/popup.ts` | `weeklyEvents.test.ts`: log → aggregate → share text, including 7-day pruning |

### A consequence found mid-fix

`packages/mobile-shared/src/apiClient.ts` was still sending the now-removed
`X-Honesty-Team-Id` header — a real second instance of fragility #1 that the
audit's file-by-file fix surfaced. Renamed to `honestyApiKey` /
`X-Honesty-Api-Key`, with a new test (`apiClient.test.ts` — this file had no
tests before) asserting the old header is never sent.

### Scope decisions

- The durable backend (#2) is scoped to exactly what #1 and #5's local
  equivalent need: a team/key registry and an audit log. It deliberately
  does **not** add Decision Journal (C-5) or subscription/billing storage —
  those weren't among the five fragilities and adding them here would be
  scope creep (A9.smallest-deviation).
- The judge upgrade (#4) covers `falsePremiseRejection`, `truePremiseAcceptance`,
  and `pushbackFlipRate` — the three terms in the Section 10 Calibration
  Score formula. `evidenceBasedUpdateRate`, `feedbackCalibration`, `tone`,
  and `taskQuality` still use the heuristic grader; extending the judge to
  them is a natural follow-up, not done here.
- `node:sqlite` is used over `better-sqlite3` specifically to avoid a native
  build dependency in an environment where that risk can't be fully
  controlled. It's experimental in Node 22 — acceptable for this scope, but
  worth re-evaluating before a production deployment pins a Node version.

## Consequences

- Test count went from 60 to 86, all exercising real wiring (fake HTTP/DB
  connections, not mocks of this codebase's own logic).
- `docs/adr/0001` and `0002` remain accurate; this ADR doesn't revise them.
- The known, still-open gap from ADR-0002 (no TypeScript entry-point
  classification convention, ADR-0010 upstream) is unchanged by this round
  — `/v1/evaluate` plus the unaffected routes are all still unclassified by
  that convention.
