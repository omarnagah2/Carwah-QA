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

  /** The list's own spinner, shown while the reservations are being fetched. */
  private get loadingIndicator(): Locator {
    return this.page.locator('.MuiCircularProgress-root, [role="progressbar"]');
  }

  /** How many reservations are currently pending on the account. */
  async pendingReservationCount(): Promise<number> {
    await this.open();
    return this.pendingStatus.count();
  }

  /**
   * Open the rentals list and wait for it to have actually loaded.
   *
   * The "الحجوزات" heading is page furniture and is on screen well before any
   * reservation is, so waiting for it alone leaves the list empty. Counting
   * then reports zero pending for an account that has one, and the booking
   * that follows is refused with the pending alert. Waiting for the list's own
   * spinner to go is what makes the count mean anything.
   */
  async open(): Promise<void> {
    await this.page.goto('/ar/my-rentals', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText('الحجوزات').first()).toBeVisible({ timeout: 30_000 });
    await expect(this.loadingIndicator).toHaveCount(0, { timeout: 30_000 });
  }

  private async hasPending(): Promise<boolean> {
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
