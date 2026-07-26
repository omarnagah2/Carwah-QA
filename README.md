# Carwah UI Playwright Automation

Playwright + TypeScript automation project using Page Object Model and object-oriented design.

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
