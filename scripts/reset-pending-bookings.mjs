// Cancels any pending reservation on the primary test account.
// Booking tests deliberately do not clean up: having no pending reservation is
// a business precondition they assert, so clearing it is an environment step.
//   npm run reset:bookings
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL?.replace(/\/(ar|en)$/, '') ?? 'http://prewebsite.carwah.co';
const browser = await chromium.launch({ args: ['--allow-running-insecure-content'] });
const page = await (await browser.newContext({ storageState: './playwright/.auth/user.json' })).newPage();
const session = JSON.parse(readFileSync('./playwright/.auth/session.json', 'utf-8'));
await page.addInitScript((store) => {
  if (location.hostname !== 'prewebsite.carwah.co') return;
  for (const [key, value] of Object.entries(store)) sessionStorage.setItem(key, value);
}, session);

let cancelled = 0;
for (let attempt = 0; attempt < 5; attempt += 1) {
  await page.goto(`${BASE}/ar/my-rentals`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(3_500);
  const pending = page.getByText(/قيد ال[إا]نتظار/).first();
  if (!(await pending.count())) break;
  await pending.evaluate((el) => {
    let node = el;
    for (let i = 0; i < 10 && node?.parentElement; i += 1) {
      node = node.parentElement;
      const dots = node?.querySelector('button.dots');
      if (dots) { dots.click(); return; }
    }
  });
  await page.waitForTimeout(1_200);
  await page.getByText('إلغاء الحجز').first().click();
  await page.waitForTimeout(1_500);
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="cancel-reason"]').first().check({ force: true });
  await page.waitForTimeout(400);
  await dialog.getByRole('button', { name: 'إلغاء الحجز' }).first().click();
  await page.waitForTimeout(3_000);
  cancelled += 1;
}
console.log(`Cancelled ${cancelled} pending reservation(s); account is clean.`);
await browser.close();
