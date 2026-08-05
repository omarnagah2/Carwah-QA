import { readFileSync } from 'node:fs';
import { test as base } from '@playwright/test';
import { primaryAccount } from '../config/auth';
import { routeOriginTraffic } from '../utils/origin-routing';
import { waitOutRateLimit } from '../utils/rate-limit';

/**
 * Top-level sessionStorage keys worth restoring: the session itself, plus the
 * flag that stops the app asking for the location again.
 */
const SEEDED_KEYS = ['authDataAction', 'hasRequestedLocation'];

/**
 * Sub-keys of the redux-persist store worth restoring. `authentication` is the
 * session; `language` keeps the Arabic UI the selectors are written against;
 * `_persist` is redux-persist's own rehydration metadata.
 *
 * Everything else the snapshot holds — `search_data`, `cars`, `booking` and the
 * rest — is live state the test creates as it goes. Replaying the captured copy
 * pinned the search to whichever city and dates were on screen when the session
 * was recorded, and because seeding runs on every document load it put them
 * back on the navigation right after a test picked its own.
 */
const SEEDED_PERSIST_KEYS = ['authentication', 'language', '_persist'];

interface SessionSeed {
  plain: Record<string, string>;
  persist: Record<string, unknown>;
}

/** Split a captured snapshot into just the parts a test should restore. */
function readSeed(sessionFile: string): SessionSeed {
  const snapshot: Record<string, string> = JSON.parse(readFileSync(sessionFile, 'utf-8'));

  const plain: Record<string, string> = {};
  for (const key of SEEDED_KEYS) {
    if (snapshot[key] !== undefined) {
      plain[key] = snapshot[key];
    }
  }

  const persist: Record<string, unknown> = {};
  if (snapshot['persist:root']) {
    const root = JSON.parse(snapshot['persist:root']);
    for (const key of SEEDED_PERSIST_KEYS) {
      if (root[key] !== undefined) {
        persist[key] = root[key];
      }
    }
  }

  return { plain, persist };
}

/**
 * Builds a test object that restores the account's session on every page load.
 * The app keeps its auth token in sessionStorage, which `storageState` does not
 * cover, and the init script has to re-run on every document load because each
 * navigation starts with an empty store.
 *
 * It restores **only** the session, and merges it into whatever the app already
 * holds. Replacing the store outright would discard the current search the same
 * way replaying the captured one overwrote it.
 *
 * Pair it with `test.use({ storageState: account.storageState })` in the spec so
 * both halves of the session come from the same account.
 */
export function createAuthenticatedTest(sessionFile: string) {
  return base.extend({
    page: async ({ page }, use, testInfo) => {
      // A retry that starts straight after a 429 re-fires the whole journey
      // into a limiter that is still hot, so wait its window out first — and
      // hand the test back the time that cost it, since fixture setup counts
      // against the test timeout.
      const waited = await waitOutRateLimit();
      if (waited > 0) {
        testInfo.setTimeout(testInfo.timeout + waited);
      }

      const seed = readSeed(sessionFile);
      await routeOriginTraffic(page);

      await page.addInitScript((session: SessionSeed) => {
        if (window.location.hostname !== 'prewebsite.carwah.co') {
          return;
        }

        for (const [key, value] of Object.entries(session.plain)) {
          window.sessionStorage.setItem(key, value);
        }

        const existing = window.sessionStorage.getItem('persist:root');
        const root = existing ? JSON.parse(existing) : {};
        for (const [key, value] of Object.entries(session.persist)) {
          root[key] = value;
        }
        window.sessionStorage.setItem('persist:root', JSON.stringify(root));
      }, seed);

      await use(page);
    },
  });
}

export const test = createAuthenticatedTest(primaryAccount.sessionFile);

export { expect } from '@playwright/test';
