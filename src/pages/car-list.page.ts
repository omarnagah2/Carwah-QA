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
    await expect(this.listHeading).toBeVisible();
    await expect(this.carCards.first()).toBeVisible();
  }

  async selectFirstCar(): Promise<void> {
    await this.carCards.first().click();
    await this.page.waitForURL(/car-branches/, { timeout: 30_000 });
  }
}
