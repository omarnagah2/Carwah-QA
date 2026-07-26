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
    await expect(this.heading).toBeVisible();
    await expect(this.branchCards.first()).toBeVisible();
  }

  async selectFirstBranch(): Promise<void> {
    await this.branchCards.first().click();
    await this.page.waitForURL(/car-details/, { timeout: 30_000 });
  }
}
