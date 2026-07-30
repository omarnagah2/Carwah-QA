import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class MyRentalsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get pendingStatus(): Locator {
    return this.page.getByText(/قيد ال[إا]نتظار/);
  }

  private get cancelDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'إلغاء الطلب' });
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
      await this.cancelFirstPending();
    }
  }

  private async cancelFirstPending(): Promise<void> {
    // Open the "..." actions menu on the pending card, then Cancel Reservation.
    await this.pendingStatus.first().evaluate((el) => {
      let node: HTMLElement | null = el as HTMLElement;
      for (let i = 0; i < 10 && node?.parentElement; i += 1) {
        node = node.parentElement;
        const dots = node?.querySelector('button.dots') as HTMLButtonElement | null;
        if (dots) {
          dots.click();
          return;
        }
      }
    });

    await this.page.getByText('إلغاء الحجز').first().click();

    // The confirm button is disabled until a cancellation reason is chosen.
    await expect(this.cancelDialog).toBeVisible();
    await this.cancelDialog.locator('input[name="cancel-reason"]').first().check({ force: true });
    const confirm = this.cancelDialog.getByRole('button', { name: 'إلغاء الحجز' });
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(this.page.getByText(/تم .*ألغاء الحجز بنجاح|تم إلغاء الحجز/)).toBeVisible({
      timeout: 20_000,
    });
  }
}
