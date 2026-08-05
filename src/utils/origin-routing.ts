import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { APIResponse, Page, Route } from '@playwright/test';
import { noteRateLimited } from './rate-limit';

const ORIGIN = 'http://prewebsite.carwah.co';

/**
 * Next.js serves its bundle from content-hashed URLs, so a given path always
 * holds the same bytes and a cache hit can never be stale. Caching them on disk
 * is worth it because every test gets a fresh browser context, and therefore an
 * empty HTTP cache: without it the same ~90 chunks are pulled from the origin
 * again for every test and every retry. They were around 60% of the requests we
 * made to the origin, and every 429 we have seen landed on one of them.
 *
 * Deleting the directory is always safe; `npm run clean:cache` does it.
 */
const CACHE_DIR = path.join(process.cwd(), '.cache', 'next-static');

/** The only two types the bundle contains; fonts and images are aborted below. */
const CONTENT_TYPES: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

/** Waits between attempts when the origin refuses a chunk. */
const BACKOFF_MS = [1_000, 3_000, 6_000];

/**
 * Content-hashed filenames are unique on their own, so flattening the path into
 * a single name keeps the cache a flat directory without risking collisions.
 */
function cacheFileFor(pathname: string): string {
  return path.join(CACHE_DIR, pathname.replace(/[^\w.-]/g, '_'));
}

/**
 * Refetch a throttled asset instead of letting it fail. A missing chunk boots
 * the app without the code that renders the page, so the test then fails on a
 * blank screen far away from the real cause.
 */
async function fetchWithBackoff(route: Route): Promise<APIResponse> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await route.fetch();
    if (response.status() !== 429) {
      return response;
    }

    noteRateLimited();
    if (attempt >= BACKOFF_MS.length) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
  }
}

/**
 * Cut what the suite costs the rate-limited origin.
 *
 * Decorative assets are dropped: no locator here matches an image, and the
 * Google Maps tiles the delivery picker needs come from another host, so they
 * are untouched.
 *
 * Bundle assets are served from disk when they have been fetched before, and
 * retried with backoff when the origin refuses them. Only those are fetched
 * through the route: fulfilling a document response would leave the browser on
 * the pre-redirect URL, and the specs poll the URL to know where they are.
 */
export async function routeOriginTraffic(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const request = route.request();
    const type = request.resourceType();
    const url = request.url();

    if (type === 'image' || type === 'font' || type === 'media' || url.includes('/cdn-cgi/rum')) {
      return route.abort();
    }

    const { pathname } = new URL(url);
    const contentType = CONTENT_TYPES[path.extname(pathname)];
    if (!pathname.startsWith('/_next/static/') || !contentType) {
      return route.continue();
    }

    const cacheFile = cacheFileFor(pathname);
    if (existsSync(cacheFile)) {
      return route.fulfill({ body: readFileSync(cacheFile), contentType });
    }

    const response = await fetchWithBackoff(route);
    if (response.ok()) {
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(cacheFile, await response.body());
    }

    return route.fulfill({ response });
  });
}
