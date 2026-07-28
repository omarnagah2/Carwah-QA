import { defineConfig, devices } from '@playwright/test';
import { authFile } from './src/config/auth';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // These specs exercise a shared live pre-prod backend whose latency can
  // degrade during deployment windows, so retry to absorb transient blips.
  // Failures that survive retries are classified by the environment-classifier
  // reporter (environment-related vs automation defect).
  retries: 2,
  // Every spec drives the same live pre-prod backend, and running them at once
  // overloads it: the booking flows in particular then fail on pages that never
  // finish rendering. Serial runs measurably cut that flakiness, so one worker
  // is the default. Override per run with `--workers=N`.
  workers: 1,
  reporter: [['html'], ['list'], ['./src/reporters/environment-classifier.ts']],
  use: {
    // The prewebsite calls its GraphQL endpoint over HTTP, so the test page also
    // runs over HTTP to avoid Chromium blocking requestPasscode as mixed content.
    baseURL: process.env.BASE_URL ?? 'http://prewebsite.carwah.co/en',
    // Grant location up front so the browser never shows its "allow location"
    // prompt on first visit, and so distance-based data (branch distances,
    // nearest-branch ordering) is the same on every run.
    permissions: ['geolocation'],
    geolocation: {
      latitude: Number(process.env.CARWAH_GEO_LAT ?? 24.7136), // Riyadh
      longitude: Number(process.env.CARWAH_GEO_LNG ?? 46.6753),
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        launchOptions: {
          args: ['--allow-running-insecure-content'],
        },
      },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
        launchOptions: {
          args: ['--allow-running-insecure-content'],
        },
      },
    },
    {
      name: 'firefox',
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: authFile,
      },
    },
    {
      name: 'webkit',
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Safari'],
        storageState: authFile,
      },
    },
  ],
});
