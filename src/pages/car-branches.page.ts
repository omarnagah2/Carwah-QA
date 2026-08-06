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

  /** Open a branch card and wait for the car details page it leads to. */
  private async openBranch(card: Locator): Promise<void> {
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.click();
    await this.page.waitForURL(/car-details/, { timeout: 30_000 });
  }

  /**
   * The block for one ally: its `.inner-card` header and its `.price-label`
   * badge sit in separate subtrees, so the block is their nearest common
   * ancestor — `.last()` is the innermost div holding both. The block's own
   * class is a styled-components hash that changes with every build, which is
   * why it is found by what it contains rather than by name.
   */
  private branchBlockAtPrice(price: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.branchCards })
      .filter({
        has: this.page
          .locator('.price-label')
          // Guard the leading digit so "200" cannot match "1200".
          .filter({ hasText: new RegExp(`(?:^|[^\\d])${price}\\s*/`) }),
      })
      .last();
  }

  /**
   * Pick the branch by its price. Every ally for this car is at the same
   * location, and the confirmation type is a branch feature that can be turned
   * on and off, so neither identifies a branch — the price does. Fails rather
   * than falling back to another branch.
   *
   * The price is per day on a daily search and per month on a monthly one, and
   * the same ally carries a different figure in each, so the caller supplies
   * whichever applies to the search it made.
   */
  async selectBranchByPrice(price: string): Promise<void> {
    const block = this.branchBlockAtPrice(price);

    await expect(
      block,
      `no branch priced ${price} is offered for this car — not falling back to another branch`,
    ).toBeVisible({ timeout: 30_000 });

    await this.openBranch(block.locator('.inner-card').first());
  }

  async selectFirstBranch(): Promise<void> {
    await this.openBranch(this.branchCards.first());
  }
}
