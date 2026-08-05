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

  private activeFilterChip(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  private get noResultsMessage(): Locator {
    return this.page.getByText(/لا يوجد نتائج|لا يوجد سيارات متوافقة/);
  }

  /** The chosen filter is echoed back as a removable chip above the results. */
  async expectFilteredBy(label: string): Promise<void> {
    await expect(this.activeFilterChip(label).first()).toBeVisible({ timeout: 30_000 });
  }

  async expectResults(): Promise<void> {
    await expect(this.carCards.first()).toBeVisible({ timeout: 30_000 });
    await expect(this.noResultsMessage).toBeHidden();
  }

  async expectNoResults(): Promise<void> {
    await expect(this.noResultsMessage.first()).toBeVisible({ timeout: 30_000 });
    await expect(this.carCards).toHaveCount(0);
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

  /** The search box above the results; MUI renders it without a placeholder. */
  private get listSearchInput(): Locator {
    return this.page.locator('input.MuiOutlinedInput-input').first();
  }

  /**
   * Filter the results by name. The box needs real keystrokes and then Enter:
   * `fill()` sets a value the filter never sees, and typing alone leaves the
   * whole list on screen — only Enter applies it.
   */
  async searchForCar(term: string): Promise<void> {
    await expect(this.listSearchInput).toBeVisible({ timeout: 30_000 });
    await this.listSearchInput.click();
    await this.listSearchInput.pressSequentially(term, { delay: 120 });
    await this.page.keyboard.press('Enter');
    await expect(this.carCards.first()).toBeVisible({ timeout: 30_000 });
    // The grid re-renders in place, so let the filtered set settle.
    await this.page.waitForTimeout(2_500);
  }

  /**
   * Pick the pinned vehicle out of the filtered results. Several listings share
   * a model name, so the branch count is part of the identity. Fails rather
   * than falling back to a different vehicle.
   */
  async selectPinnedCar(label: string, branchCount: string): Promise<void> {
    const card = this.carCards.filter({ hasText: label }).filter({ hasText: branchCount });

    await expect(
      card.first(),
      `pinned car "${label}" (${branchCount}) is not in these results — not falling back to another vehicle`,
    ).toBeVisible({ timeout: 30_000 });

    await card.first().scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1_500);
    await card.first().click();
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
