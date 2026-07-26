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
