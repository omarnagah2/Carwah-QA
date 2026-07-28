import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CarListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get listHeading(): Locator {
    return this.page.getByText('قائمة السيارات');
  }

  private get carCards(): Locator {
    return this.page.locator('.white-card');
  }

  async expectLoaded(): Promise<void> {
    // Search results come from the live backend and are noticeably slower when
    // several specs run in parallel, so allow more than the default timeout.
    await expect(this.listHeading).toBeVisible({ timeout: 30_000 });
    await expect(this.carCards.first()).toBeVisible({ timeout: 30_000 });
  }

  async selectFirstCar(): Promise<void> {
    await this.carCards.first().click();
    await this.page.waitForURL(/car-branches/, { timeout: 30_000 });
  }

  async selectCarByName(name: string | RegExp): Promise<void> {
    const card = this.carCards.filter({ hasText: name }).first();

    // The grid renders lazily, so scroll down to load more cards until the target
    // appears (or we have scrolled the whole list).
    for (let attempt = 0; attempt < 8 && (await card.count()) === 0; attempt++) {
      await this.page.mouse.wheel(0, 1_400);
      await this.page.waitForTimeout(800);
    }

    // The list reflows as lazy car images load, which keeps shifting the card and
    // makes the click target unstable on slower browsers. Scroll it into view and
    // let the layout settle before clicking.
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1_500);
    await card.click();
    await this.page.waitForURL(/car-branches/, { timeout: 30_000 });
  }
}
