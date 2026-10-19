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
- **Injection timing is best-effort.** `onBeforeSend` reads `chrome.storage`
  asynchronously, while the host page's own Enter/click handler may submit
  synchronously — see the comment above `main()` in `content.ts`. On some
  pages the directive can land one message late. A robust fix intercepts
  with `preventDefault`/`stopImmediatePropagation` and resubmits manually;
  not implemented here.
- **No signed remote selector config.** Section 5.2 calls for "remote
  selector configuration (data only, no remote code)." Fetching unsigned
  JSON and trusting it would be worse than not having the feature, so only
  the bundled, reviewed defaults ship. Add it once a signing/verification
  path exists.
