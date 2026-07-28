import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Page } from '@playwright/test';
import type { AccountAuth } from '../config/auth';
import { LoginPage } from '../pages/login.page';

/** Re-login this long before the token actually expires. */
const TOKEN_SAFETY_MARGIN_MS = 60 * 60 * 1000;

function decodeTokenExpiry(token: string): number | undefined {
  const payload = token.split('.')[1];
  if (!payload) {
    return undefined;
  }

  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  return typeof decoded.exp === 'number' ? decoded.exp : undefined;
}

/**
 * True when both halves of the account's session are on disk and its token is
 * still comfortably in date.
 */
export function hasValidStoredSession(account: AccountAuth): boolean {
  try {
    if (!existsSync(account.storageState) || !existsSync(account.sessionFile)) {
      return false;
    }

    const session = JSON.parse(readFileSync(account.sessionFile, 'utf-8'));
    const authData = JSON.parse(session.authDataAction ?? '{}');

    if (typeof authData.token !== 'string') {
      return false;
    }

    const expiry = decodeTokenExpiry(authData.token);
    return expiry !== undefined && expiry * 1000 - Date.now() > TOKEN_SAFETY_MARGIN_MS;
  } catch {
    // A missing or malformed file just means we have to sign in again.
    return false;
  }
}

/**
 * Signs the given phone number in and persists both halves of its session:
 * storageState (cookies + localStorage) and raw sessionStorage, which the app
 * keeps its auth token and search state in.
 *
 * A still-valid session on disk is reused so runs do not depend on the OTP
 * flow every time. Set FORCE_LOGIN=1 to sign in regardless.
 */
export async function authenticateAccount(
  page: Page,
  phoneNumber: string,
  account: AccountAuth,
): Promise<void> {
  if (!process.env.FORCE_LOGIN && hasValidStoredSession(account)) {
    console.log(`Reusing stored session for ${phoneNumber} (set FORCE_LOGIN=1 to sign in again).`);
    return;
  }

  await new LoginPage(page).loginWithPhoneNumber(phoneNumber);

  mkdirSync(dirname(account.storageState), { recursive: true });
  await page.context().storageState({ path: account.storageState });

  const sessionStorage = await page.evaluate(() => JSON.stringify(window.sessionStorage));
  writeFileSync(account.sessionFile, sessionStorage, 'utf-8');
}
