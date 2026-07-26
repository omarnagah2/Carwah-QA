import { readFileSync } from 'node:fs';
import { test as base } from '@playwright/test';
import { authSessionFile } from '../config/auth';

export const test = base.extend({
  page: async ({ page }, use) => {
    const sessionStorage = JSON.parse(readFileSync(authSessionFile, 'utf-8'));

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

export { expect } from '@playwright/test';
