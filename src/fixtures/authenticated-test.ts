import { readFileSync } from 'node:fs';
import { test as base, type Page } from '@playwright/test';
import { primaryAccount } from '../config/auth';

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
/**
 * Cloudflare rate-limits requests to the web origin, and a page load fetches
 * around 48 of them in a single second — mostly images and fonts. The 429s land
 * on those assets and on page routes; the GraphQL API is never throttled.
 *
 * Dropping the decorative ones cuts the burst without changing what the tests
 * assert: no locator here matches an image, and the Google Maps tiles the
 * delivery picker needs come from another host, so they are untouched.
 */
async function dropDecorativeAssets(page: Page): Promise<void> {
  await page.route('http://prewebsite.carwah.co/**', (route) => {
    const type = route.request().resourceType();
    const url = route.request().url();

    if (type === 'image' || type === 'font' || type === 'media' || url.includes('/cdn-cgi/rum')) {
      return route.abort();
    }

    return route.continue();
  });
}

export function createAuthenticatedTest(sessionFile: string) {
  return base.extend({
    page: async ({ page }, use) => {
      const seed = readSeed(sessionFile);
      await dropDecorativeAssets(page);

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
