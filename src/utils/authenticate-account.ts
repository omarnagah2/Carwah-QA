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

/** Digits only, without the 966 country code the app stores numbers with. */
function normalisePhone(value: string | number): string {
  return String(value).replace(/\D/g, '').replace(/^966/, '');
}

/**
 * The customer a stored session actually belongs to, as the app recorded it.
 * Undefined when there is no readable session on disk.
 */
export function storedSessionPhone(account: AccountAuth): string | undefined {
  try {
    const session = JSON.parse(readFileSync(account.sessionFile, 'utf-8'));
    const mobile = JSON.parse(session.authDataAction ?? '{}').user?.mobile;
    return mobile === undefined ? undefined : normalisePhone(mobile);
  } catch {
    return undefined;
  }
}

/**
 * True when both halves of the account's session are on disk, its token is
 * still comfortably in date, and it belongs to the customer we mean to be.
 *
 * The last check matters: without it, changing an account's number leaves the
 * suite running as the previous customer until their token happens to expire,
 * with nothing in the output to say so.
 */
export function hasValidStoredSession(account: AccountAuth, phoneNumber?: string): boolean {
  try {
    if (!existsSync(account.storageState) || !existsSync(account.sessionFile)) {
      return false;
    }

    const session = JSON.parse(readFileSync(account.sessionFile, 'utf-8'));
    const authData = JSON.parse(session.authDataAction ?? '{}');

    if (typeof authData.token !== 'string') {
      return false;
    }

    if (phoneNumber !== undefined) {
      const stored = storedSessionPhone(account);
      if (stored === undefined || stored !== normalisePhone(phoneNumber)) {
        return false;
      }
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
  if (!process.env.FORCE_LOGIN && hasValidStoredSession(account, phoneNumber)) {
    console.log(
      `Reusing stored session — authenticated as ${storedSessionPhone(account)} ` +
        `(set FORCE_LOGIN=1 to sign in again).`,
    );
    return;
  }

  const previous = storedSessionPhone(account);
  if (previous !== undefined && previous !== phoneNumber.replace(/\D/g, '')) {
    console.log(`Stored session belongs to ${previous}; signing in as ${phoneNumber} instead.`);
  }

  await new LoginPage(page).loginWithPhoneNumber(phoneNumber);

  mkdirSync(dirname(account.storageState), { recursive: true });
  await page.context().storageState({ path: account.storageState });

  const sessionStorage = await page.evaluate(() => JSON.stringify(window.sessionStorage));
  writeFileSync(account.sessionFile, sessionStorage, 'utf-8');

  // Say who the suite is actually running as, from the session just written.
  const signedIn = storedSessionPhone(account);
  console.log(`Signed in — authenticated as ${signedIn ?? 'unknown'} (configured ${phoneNumber}).`);

  if (signedIn !== undefined && signedIn !== phoneNumber.replace(/\D/g, '')) {
    throw new Error(
      `Session was written for ${signedIn} but ${phoneNumber} was requested — refusing to run as the wrong customer.`,
    );
  }
}
