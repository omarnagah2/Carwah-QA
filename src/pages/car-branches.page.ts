import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CarBranchesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get heading(): Locator {
    return this.page.getByText(/اختر من بين الحلفاء/);
  }

  private get branchCards(): Locator {
    return this.page.locator('.inner-card');
  }

  async expectLoaded(): Promise<void> {
    // The ally list is fetched from the live backend and is slower when several
    // specs run in parallel, so allow more than the default timeout.
    await expect(this.heading).toBeVisible({ timeout: 30_000 });
    await expect(this.branchCards.first()).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Pick the pinned branch. The same location appears several times with
   * different allies, so the confirmation type is part of the identity. Fails
   * rather than falling back to another branch.
   */
  async selectPinnedBranch(label: string, confirmation: string): Promise<void> {
    const card = this.branchCards.filter({ hasText: label }).filter({ hasText: confirmation });

    await expect(
      card.first(),
      `pinned branch "${label}" (${confirmation}) is not offered for this car — not falling back to another branch`,
    ).toBeVisible({ timeout: 30_000 });

    await card.first().click();
    await this.page.waitForURL(/car-details/, { timeout: 30_000 });
  }

  async selectFirstBranch(): Promise<void> {
    await this.branchCards.first().click();
    await this.page.waitForURL(/car-details/, { timeout: 30_000 });
  }
}
