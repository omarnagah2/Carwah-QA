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
  // These specs share one live pre-prod backend and account, so cap local
  // parallelism to avoid overwhelming it (which shows up as flaky timeouts).
  workers: process.env.CI ? 1 : 3,
  reporter: [['html'], ['list'], ['./src/reporters/environment-classifier.ts']],
  use: {
    // The prewebsite calls its GraphQL endpoint over HTTP, so the test page also
    // runs over HTTP to avoid Chromium blocking requestPasscode as mixed content.
    baseURL: process.env.BASE_URL ?? 'http://prewebsite.carwah.co/en',
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
