/**
 * The web origin rate-limits per IP. A failing booking test re-fires its whole
 * journey on every retry — around 150 requests to the origin that just refused
 * us — so the two retries turn a brief throttle into a run-long one. Retrying
 * straight into a hot limiter cannot pass anyway, so a test that saw a 429
 * makes the next one wait the window out first.
 *
 * The state is per worker process, which with the default single worker is the
 * whole run.
 */

/** How long to let the limiter's window drain before the next test runs. */
const COOLDOWN_MS = Number(process.env.RATE_LIMIT_COOLDOWN_MS ?? 30_000);

let rateLimitedAt: number | undefined;

/** Record that the origin answered 429, starting the cooldown. */
export function noteRateLimited(): void {
  rateLimitedAt = Date.now();
}

/**
 * Wait out whatever is left of the cooldown, if a 429 was seen. Returns the
 * milliseconds spent so the caller can give the test that time back — fixture
 * setup counts against the test timeout.
 */
export async function waitOutRateLimit(): Promise<number> {
  if (rateLimitedAt === undefined) {
    return 0;
  }

  const remaining = COOLDOWN_MS - (Date.now() - rateLimitedAt);
  rateLimitedAt = undefined;

  if (remaining <= 0) {
    return 0;
  }

  console.log(
    `[rate-limit] origin returned 429; waiting ${Math.round(remaining / 1_000)}s before the next test.`,
  );
  await new Promise((resolve) => setTimeout(resolve, remaining));
  return remaining;
}
