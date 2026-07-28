import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Page } from '@playwright/test';
import type { AccountAuth } from '../config/auth';
import { LoginPage } from '../pages/login.page';

/**
 * Signs the given phone number in and persists both halves of its session:
 * storageState (cookies + localStorage) and raw sessionStorage, which the app
 * keeps its auth token and search state in.
 */
export async function authenticateAccount(
  page: Page,
  phoneNumber: string,
  account: AccountAuth,
): Promise<void> {
  await new LoginPage(page).loginWithPhoneNumber(phoneNumber);

  mkdirSync(dirname(account.storageState), { recursive: true });
  await page.context().storageState({ path: account.storageState });

  const sessionStorage = await page.evaluate(() => JSON.stringify(window.sessionStorage));
  writeFileSync(account.sessionFile, sessionStorage, 'utf-8');
}
