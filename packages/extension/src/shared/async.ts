/**
 * A5.12 — no fire-and-forget: every spawned async call is awaited, joined, or
 * supervised. Event listener callbacks can't be async-awaited by their
 * caller (DOM APIs expect void), so this is the supervision point — errors
 * are surfaced to the console instead of disappearing silently.
 */
export function fireAndForget(promise: Promise<unknown>, context: string): void {
  promise.catch((err: unknown) => {
    console.error(`[Honesty Layer] ${context} failed:`, err);
  });
}
