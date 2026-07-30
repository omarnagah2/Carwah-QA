import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Partner tags are applied with a `?tag=` query parameter. A recognised tag
 * shows the partner's banner above the header and records the partner in
 * sessionStorage, which keeps it applied while browsing.
 */
export class PartnerTagPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** The banner sits above the header and carries the partner's own artwork. */
  private get banner(): Locator {
    return this.page.locator('img[src*="flynas"], img[src*="stc"], img[src*="tamara"], img[src*="tabby"], img[src*="qoad"], img[src*="enterprise"], img[src*="fursan"]');
  }

  async openWithTag(tag: string): Promise<void> {
    await this.page.goto(`/ar?tag=${encodeURIComponent(tag)}`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(4_000);
  }

  async openWithoutTag(): Promise<void> {
    await this.page.goto('/ar', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(4_000);
  }

  /** What the app recorded about the partner, if anything. */
  async storedPartner(): Promise<Record<string, string>> {
    return this.page.evaluate(() =>
      Object.fromEntries(
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith('partner_'))
          .map((key) => [key, sessionStorage.getItem(key) ?? '']),
      ),
    );
  }

  async expectPartnerBanner(message: RegExp): Promise<void> {
    await expect(this.page.getByText(message).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
    await expect(this.banner.first()).toBeVisible();
  }

  async expectNoPartnerBanner(): Promise<void> {
    await expect(this.banner).toHaveCount(0);
  }

  /** Applied tags follow the customer around the site. */
  async expectTagSurvivesNavigation(message: RegExp): Promise<void> {
    await this.page.goto('/ar/support', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3_000);
    await expect(this.page.getByText(message).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  }
}
