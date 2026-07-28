import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Rent to Own is the third booking type: a listing split into new and used
 * cars, where picking a contract duration hands over to the normal car details
 * page (with `isRentToOwn=true`) and its usual payment flow.
 */
export class RentToOwnPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get discoverBanner(): Locator {
    return this.page.getByText('اكتشف');
  }

  private get carCards(): Locator {
    return this.page.locator('.white-card');
  }

  private sectionTab(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  private carCard(name: string): Locator {
    return this.carCards.filter({ hasText: name });
  }

  /** Reach the listing the way a customer does: the home page banner. */
  async openFromHomeBanner(): Promise<void> {
    const discover = this.discoverBanner.first();
    for (let attempt = 0; attempt < 10 && (await discover.count()) === 0; attempt += 1) {
      await this.page.mouse.wheel(0, 1_000);
      await this.page.waitForTimeout(500);
    }
    await discover.scrollIntoViewIfNeeded();
    await expect(discover).toBeVisible({ timeout: 20_000 });
    await discover.click();
    await this.page.waitForURL(/rent-to-own/, { timeout: 30_000 });
  }

  async open(): Promise<void> {
    await this.page.goto('/ar/rent-to-own', { waitUntil: 'domcontentloaded' });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.sectionTab('جديدة')).toBeVisible({ timeout: 30_000 });
    await expect(this.sectionTab('مستعملة')).toBeVisible();
  }

  /** Switch between the "new" and "used" sections. */
  async selectSection(section: 'new' | 'used'): Promise<void> {
    await this.sectionTab(section === 'new' ? 'جديدة' : 'مستعملة').click();
    await this.page.waitForTimeout(2_000);
  }

  async listedCarNames(): Promise<string[]> {
    await this.page.waitForTimeout(1_500);
    return this.carCards.locator('h2').allInnerTexts();
  }

  async firstListedCarName(): Promise<string> {
    await expect(this.carCards.first()).toBeVisible({ timeout: 30_000 });
    return (await this.carCards.first().locator('h2').first().innerText()).trim();
  }

  /** Resolve a partial car name to the full title shown on its card. */
  async resolveListedCarName(partialName: string): Promise<string> {
    const card = this.carCard(partialName).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    return (await card.locator('h2').first().innerText()).trim();
  }

  async expectCarListed(name: string): Promise<void> {
    await expect(this.carCard(name).first()).toBeVisible({ timeout: 30_000 });
  }

  async expectCarNotListed(name: string): Promise<void> {
    await expect(this.carCard(name)).toHaveCount(0, { timeout: 30_000 });
  }

  /** Open a car's contract-options page and return its rent-to-own id. */
  async openCar(name: string): Promise<string> {
    await this.carCard(name).first().click();
    await this.page.waitForURL(/rent-to-own-cars/, { timeout: 30_000 });
    return this.page.url().split('/').pop() ?? '';
  }

  private get durationPlanBadge(): Locator {
    // The "N شهر" badge is the only actionable control on the options page; it
    // carries the contract over to the car details page for payment.
    return this.page.getByText(/\d+\s*شهر/);
  }

  async expectCarBookable(): Promise<void> {
    await expect(this.durationPlanBadge.first()).toBeVisible({ timeout: 30_000 });
  }

  async expectCarNotBookable(): Promise<void> {
    await expect(this.durationPlanBadge).toHaveCount(0, { timeout: 30_000 });
  }

  /** Choose the contract duration, which opens the details page for payment. */
  async selectDurationPlan(): Promise<void> {
    const badge = this.durationPlanBadge.first();
    await expect(badge).toBeVisible({ timeout: 30_000 });
    await badge.click();
    await this.page.waitForURL(/car-details.*isRentToOwn=true/, { timeout: 30_000 });
  }
}
