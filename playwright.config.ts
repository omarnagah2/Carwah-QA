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
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
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
