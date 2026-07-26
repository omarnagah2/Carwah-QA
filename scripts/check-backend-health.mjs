// Quick backend health probe for the shared Carwah pre-prod environment.
// Use during failure triage to confirm whether a run hit a deployment window
// (degraded/slow backend) versus a genuine automation defect.
//
//   npm run health
//
// Exit code 0 = healthy, 1 = degraded/unreachable.

const BASE_URL = process.env.BASE_URL ?? 'http://prewebsite.carwah.co/en';
const SLOW_THRESHOLD_MS = Number(process.env.HEALTH_SLOW_MS ?? 8000);
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS ?? 20000);

async function probe(url) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Ask the server to close the socket so the process can exit promptly on
    // Windows instead of lingering on a keep-alive connection.
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { connection: 'close' },
    });
    const ms = Date.now() - startedAt;
    return { ok: response.ok, status: response.status, ms };
  } catch (error) {
    const ms = Date.now() - startedAt;
    return { ok: false, status: 0, ms, error: String(error?.message ?? error) };
  } finally {
    clearTimeout(timer);
  }
}

const result = await probe(BASE_URL);

if (!result.ok) {
  console.log(
    `DEGRADED — ${BASE_URL} unreachable after ${result.ms}ms${result.error ? ` (${result.error})` : ` (status ${result.status})`}.`,
  );
  console.log('Failures right now are likely environment-related (deployment window).');
  process.exitCode = 1;
} else if (result.ms > SLOW_THRESHOLD_MS) {
  console.log(
    `SLOW — ${BASE_URL} responded in ${result.ms}ms (threshold ${SLOW_THRESHOLD_MS}ms).`,
  );
  console.log('Backend is degraded; treat failures as environment-related.');
  process.exitCode = 1;
} else {
  console.log(`HEALTHY — ${BASE_URL} responded in ${result.ms}ms (status ${result.status}).`);
  process.exitCode = 0;
}
