# Carwah UI Playwright Automation

Playwright + TypeScript automation project using Page Object Model and object-oriented design.

## Test Layout

Specs are grouped by feature area:

```text
tests/
├── auth.setup.ts               # signs the accounts in (setup project)
├── auth-installment.setup.ts
├── auth/
│   ├── login.spec.ts
│   └── logout.spec.ts
├── home/
│   ├── coupon.spec.ts
│   └── vehicle-type-search.spec.ts
└── booking/
    ├── booking.spec.ts
    └── installment-booking.spec.ts
```

Every spec is independent — its own account where it matters, its own cleanup —
so the run order does not affect results. Run one area with, for example,
`npx playwright test tests/booking`.

## Setup

```bash
npm install
npx playwright install
```

## Run Tests

```bash
npm test
```

Run headed:

```bash
npm run test:headed
```

Run headed slowly enough to follow by eye — `SLOW_MO` is the pause in
milliseconds between browser operations, and it also raises the test timeout so
the deliberate pauses do not trip it:

```bash
SLOW_MO=300 npx playwright test --headed
```

Open Playwright UI mode:

```bash
npm run test:ui
```

## Shared Environment & Flaky-Failure Policy

These tests run against a shared pre-prod backend by design — the OTP login test
is deliberately kept on the real backend as part of end-to-end validation (no
mocking, no quarantine). Backend latency can temporarily degrade during
deployment windows, which can cause transient failures that are **not**
automation defects.

To keep the automation deterministic while acknowledging that instability:

- **Retries** are set to 2. Transient blips that recover on retry surface as
  `flaky`, not `failed`.
- **One worker** by default. Running specs concurrently overloads the shared
  backend — pages stop rendering and the booking flows fail — and serial runs
  measurably reduce that. Override with `--workers=N` if the environment is
  healthy and you want the speed.
- **Failure classification**: a custom reporter
  ([environment-classifier](src/reporters/environment-classifier.ts)) tags every
  hard failure (after retries) as either *environment-related* (timeout/network
  signature — the fingerprint of backend latency) or *automation/product defect*
  (content/logic assertion mismatch). The summary prints at the end of a run.
- **Health check**: confirm whether a run hit a deployment window.

```bash
npm run health
```

It reports `HEALTHY`, `SLOW`, or `DEGRADED` for the backend. If it reports
degraded/slow, treat concurrent failures as environment-related.

## Authentication

Signing in happens **once per account per run**, in the `setup` project — never
per test. Every browser project depends on that one setup, and the specs just
reuse the saved session:

| Account | Used by | Session files |
| --- | --- | --- |
| `598598597` | everything authenticated | `playwright/.auth/user.json` + `session.json` |
| `591594597` | `tests/booking/installment-booking.spec.ts` | `playwright/.auth/user-installment.json` + `session-installment.json` |

Two accounts exist because Carwah allows only one pending reservation per
customer, so the booking tests would otherwise cancel each other's bookings.

A saved session is **reused across runs** while its token is still in date
(checked with an hour to spare), so a normal run does not depend on the OTP flow
at all — setup drops from ~10s to well under a second. Sign in again with:

```bash
FORCE_LOGIN=1 npx playwright test
```

Login is re-run automatically when a session file is missing, unreadable, or
close to expiry. `tests/auth/login.spec.ts` always exercises the real login, so a genuine
login regression is still caught.

## Login Test

The requested website is:

```text
https://prewebsite.carwah.co/en
```

The automated test defaults to:

```text
http://prewebsite.carwah.co/en
```

The HTTP URL is used because the current prewebsite calls its GraphQL passcode endpoint over HTTP. Running the page over HTTPS causes Chromium to block the `requestPasscode` request as mixed content before the OTP response can be captured.

Default test phone number:

```text
598598597
```

The OTP is captured dynamically from the network response for the passcode request. The code extracts the numeric value from a GraphQL payload status like:

```json
{
  "status": "success 3677"
}
```

Override runtime values when needed:

```bash
$env:BASE_URL="http://prewebsite.carwah.co/en"
$env:CARWAH_PHONE_NUMBER="598598597"
npm test
```
