import { readFileSync } from 'node:fs';
import { test as base } from '@playwright/test';
import { primaryAccount } from '../config/auth';

/**
 * Builds a test object that re-seeds the account's sessionStorage on every page
 * load. The app keeps its auth token and search state there, and storageState
 * alone does not cover it.
 *
 * Pair it with `test.use({ storageState: account.storageState })` in the spec so
 * both halves of the session come from the same account.
 */
export function createAuthenticatedTest(sessionFile: string) {
  return base.extend({
    page: async ({ page }, use) => {
      const sessionStorage = JSON.parse(readFileSync(sessionFile, 'utf-8'));

      await page.addInitScript((storage: Record<string, string>) => {
        if (window.location.hostname !== 'prewebsite.carwah.co') {
          return;
        }

        for (const [key, value] of Object.entries(storage)) {
          window.sessionStorage.setItem(key, value);
        }
      }, sessionStorage);

      await use(page);
    },
  });
}

export const test = createAuthenticatedTest(primaryAccount.sessionFile);

export { expect } from '@playwright/test';
