# @honesty/mobile-shared

Business logic for C-3 (Honesty Keyboard), C-4 (Second Opinion), C-5
(Decision Check/Journal), and C-6 (Flattery Meter) — the parts of those
features that don't depend on a platform.

**This package is not a native app.** There is no Xcode project, no Android
Studio project, and no app bundle here. A native iOS/Android shell would:

1. Render its own UI (a custom keyboard extension, a share-sheet target, a
   journal screen).
2. Call into this package for prompt text, scoring, and the proxy client.
3. Call `packages/proxy`'s real `/v1/chat/completions` endpoint via
   `apiClient.ts`'s `callHonestyProxy`.

Building and signing that shell needs tooling (Xcode, Android Studio,
developer accounts) this environment doesn't have — see the top-level
README's "What's explicitly not here" section.
