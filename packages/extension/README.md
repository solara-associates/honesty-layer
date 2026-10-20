# @honesty/extension

Manifest V3 browser extension (F-2) for claude.ai and chatgpt.com.

## Build and load

```sh
npm run build          # tsc typecheck, then esbuild bundle to dist/
```

Then in Chrome: `chrome://extensions` → Developer mode → Load unpacked →
select `packages/extension/dist`.

## Known limitations, read before shipping

- **Selectors are unverified against the live DOM.** `src/shared/selectorConfig.ts`
  documents this explicitly. The health check (`runHealthCheck` in
  `content.ts`) is the safety net: if the composer selector doesn't match, the
  extension disables itself on that site and tells the user, rather than
  silently doing nothing or corrupting the page. Before a real release,
  verify the selectors against the current claude.ai/chatgpt.com markup.
- **Injection timing is now deterministic, not raced.** The original Enter/
  click event is fully intercepted (`preventDefault` + `stopImmediatePropagation`
  in `main()`, `content.ts`) before the host page ever sees it; injection
  completes; only then does `interceptAndResend` dispatch a synthetic
  send that the host's own handler observes. `content.test.ts` proves this
  with a simulated host listener that only ever sees post-injection text.
  Residual risk: the synthetic `KeyboardEvent`/`.click()` may not trigger
  every framework's event system identically to a trusted, user-originated
  event (React generally handles both the same way via its delegated
  listeners; a framework with stricter `isTrusted` checks might not).
  Verify against the live site before shipping.
- **No signed remote selector config.** Section 5.2 calls for "remote
  selector configuration (data only, no remote code)." Fetching unsigned
  JSON and trusting it would be worse than not having the feature, so only
  the bundled, reviewed defaults ship. Add it once a signing/verification
  path exists.
