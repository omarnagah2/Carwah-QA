import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { CarDetailsPage } from './car-details.page';

export class MyRentalsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get pendingStatus(): Locator {
    return this.page.getByText(/قيد ال[إا]نتظار/);
  }


  /** How many reservations are currently pending on the account. */
  async pendingReservationCount(): Promise<number> {
    await this.open();
    await this.page.waitForTimeout(2_000);
    return this.pendingStatus.count();
  }

  async open(): Promise<void> {
    await this.page.goto('/ar/my-rentals', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText('الحجوزات').first()).toBeVisible({ timeout: 30_000 });
  }

  private async hasPending(): Promise<boolean> {
    // Give the list a moment to render before deciding there is no pending card.
    await this.page.waitForTimeout(1_500);
    return (await this.pendingStatus.count()) > 0;
  }

  /**
   * Cancels every pending reservation on the account (Carwah allows only one at
   * a time, but abandoned pay attempts can leave one behind). Idempotent: does
   * nothing if there is no pending reservation.
   */
  async cancelAllPendingReservations(): Promise<void> {
    for (let guard = 0; guard < 4; guard += 1) {
      await this.open();
      if (!(await this.hasPending())) {
        return;
      }
      await this.openFirstPending();
      await new CarDetailsPage(this.page).cancelReservation();
    }
  }

  /**
   * Open the pending reservation's own details page, which is where a booking
   * is cancelled from. The card itself is the link — the previous route went
   * through the card's "..." menu, which was only reachable by walking up the
   * DOM from the status label.
   */
  private async openFirstPending(): Promise<void> {
    await this.pendingStatus.first().click();
    await this.page.waitForURL(/bookingId=/, { timeout: 30_000 });
  }
}
