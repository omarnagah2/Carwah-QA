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

  /** The search box above the results; MUI renders it without a placeholder. */
  private get listSearchInput(): Locator {
    return this.page.locator('input.MuiOutlinedInput-input').first();
  }

  private activeFilterChip(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  private get noResultsMessage(): Locator {
    return this.page.getByText(/لا يوجد نتائج|لا يوجد سيارات متوافقة/);
  }

  async expectLoaded(): Promise<void> {
    // Search results come from the live backend and are noticeably slower when
    // several specs run in parallel, so allow more than the default timeout.
    await expect(this.listHeading).toBeVisible({ timeout: 30_000 });
    await this.expectResults();
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

  /**
   * Open a car card and wait for its branches page.
   *
   * The grid reflows while it settles, which keeps shifting the card and makes
   * the click target unstable, so bring it into view and let the layout come to
   * rest before clicking.
   */
  private async openCar(card: Locator): Promise<void> {
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1_500);
    await card.click();
    await this.page.waitForURL(/car-branches/, { timeout: 30_000 });
  }

  async selectFirstCar(): Promise<void> {
    await this.openCar(this.carCards.first());
  }

  /**
   * Filter the results by name. The box needs real keystrokes and then Enter:
   * `fill()` sets a value the filter never sees, and typing alone leaves the
   * whole list on screen — only Enter applies it.
   */
  async searchForCar(term: string): Promise<void> {
    await expect(this.listSearchInput).toBeVisible({ timeout: 30_000 });
    await this.listSearchInput.click();
    // Reaching the list a second time within one test keeps the previous term
    // in the box, and typing would append to it — "سيمبولسيمبول" matches nothing.
    await this.listSearchInput.clear();
    await this.listSearchInput.pressSequentially(term, { delay: 120 });
    await this.page.keyboard.press('Enter');

    await this.expectResults();
    // The grid re-renders in place, so let the filtered set settle.
    await this.page.waitForTimeout(2_500);
  }

  /**
   * Pick the pinned vehicle out of the filtered results. Several listings share
   * a model name, so a discriminator is part of the identity — the branch count
   * in a city search, the daily price under delivery, where every listing shows
   * a single branch. Fails rather than falling back to a different vehicle.
   */
  async selectPinnedCar(label: string, discriminator: string): Promise<void> {
    const card = this.carCards
      .filter({ hasText: label })
      .filter({ hasText: discriminator })
      .first();

    await expect(
      card,
      `pinned car "${label}" (${discriminator}) is not in these results — not falling back to another vehicle`,
    ).toBeVisible({ timeout: 30_000 });

    await this.openCar(card);
  }

  async selectCarByName(name: string | RegExp): Promise<void> {
    const card = this.carCards.filter({ hasText: name }).first();

    // The grid renders lazily, so scroll down to load more cards until the target
    // appears (or we have scrolled the whole list).
    for (let attempt = 0; attempt < 8 && (await card.count()) === 0; attempt++) {
      await this.page.mouse.wheel(0, 1_400);
      await this.page.waitForTimeout(800);
    }

    await this.openCar(card);
  }
}
