# @honesty/proxy

OpenAI- and Anthropic-compatible proxy (F-3). See the top-level README for
the full picture.

## Run it

```sh
npm run build
PORT=8787 npm start
```

## Authentication (ADR-0003)

Every route requires a real, issued `X-Honesty-Api-Key` header — there is no
self-asserted team id anymore. Provision a team first:

```sh
npm run build   # scripts/create-team.mjs imports from dist/
node scripts/create-team.mjs "My Team"
# Team created: team_...
# API key (shown once, store it securely): hl_live_...
# Use it as: X-Honesty-Api-Key: hl_live_...
```

Keys are stored hashed (SHA-256) in the SQLite file at `HONESTY_DB_PATH`
(default `./data/honesty.db`) — the plaintext key is never persisted and is
only ever shown once, at creation. There is no revoke-by-name command yet;
use `TeamRegistry.revokeApiKey(plaintextKey)` directly if you still have it.

## Environment variables

| Var | Default | What |
| :- | :- | :- |
| `PORT` | `8787` | Listen port. |
| `HONESTY_DB_PATH` | `./data/honesty.db` | SQLite file (`node:sqlite`, no native dependency) backing the team/API-key registry and the durable audit log. |
| `HONESTY_OPENAI_BASE_URL` | `https://api.openai.com` | Upstream for `/v1/chat/completions`. |
| `HONESTY_ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | Upstream for `/v1/messages`. |
| `HONESTY_JEV_BASE_URL` | unset | A Jev-compatible decision server (e.g. a self-hosted [razorback16/openjev](https://github.com/razorback16/openjev)). Unset disables F-7 entirely (`/v1/evaluate` returns 503) and keeps F-1 on the rule-based classifier. See [ADR-0002](../../docs/adr/0002-jev-decision-engine-integration.md). |
| `HONESTY_JEV_API_KEY` | unset | Bearer token forwarded to the Jev server. |
| `HONESTY_JEV_MODEL` | `openjev-latest` | Model id sent in Jev requests. |
| `HONESTY_CLASSIFIER_MODE` | `rules` | Set to `jev` to use the Jev-backed classifier on the **blocking** F-1 path instead of only for F-7. Read the latency caveat in `src/infrastructure/jevClassifier.ts` before doing this in production. |

## Routes

- `POST /v1/chat/completions` — OpenAI-compatible, directive-injecting.
- `POST /v1/messages` — Anthropic-compatible, directive-injecting.
- `POST /v1/evaluate` — F-7 Truth/Logic Evaluator: `{responseText}` →
  `EvaluatorVerdict`. 503 if `HONESTY_JEV_BASE_URL` isn't set; 502 if the
  Jev server call fails. Never fabricates a verdict on failure.
- `GET /healthz`
