import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CarDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get changePaymentMethodTrigger(): Locator {
    return this.page.getByText('تغيير طريقة الدفع');
  }

  private get paymentDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('heading', { name: 'اختر طريقة دفع' }) });
  }

  private paymentMethod(name: string | RegExp): Locator {
    return this.paymentDialog.getByRole('heading', { name });
  }

  private get payNowButton(): Locator {
    // The label uses الأن (alef-hamza), so match both spellings defensively.
    return this.page.getByRole('button', { name: /ادفع ال[أآ]ن/ });
  }

  private get pendingRentalDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /حجز قيد ال[إا]نتظار/ });
  }

  private get proceedButton(): Locator {
    // Rental-package (installment) bookings proceed to an installments dialog
    // instead of paying straight away.
    return this.page.getByRole('button', { name: /التالي|Proceed/i });
  }

  private get installmentsDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /ستكون الدفعات الشهرية/ });
  }

  async proceedToInstallments(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const button = this.proceedButton.first();
    await expect(button).toBeVisible({ timeout: 20_000 });
    await button.click();
  }

  async expectInstallmentsDialog(): Promise<void> {
    await expect(this.installmentsDialog).toBeVisible({ timeout: 20_000 });
    // Splitting the amount into monthly instalments is what makes this an
    // instalment booking, and the schedule lists the resulting payments.
    await expect(
      this.installmentsDialog.locator('input[type="checkbox"]').first(),
    ).toBeChecked();
    await expect(
      this.installmentsDialog.getByText(/ستكون الدفعات الشهرية/),
    ).toBeVisible();
    await expect(
      this.installmentsDialog.getByRole('button', { name: /ادفع ال[أآ]ن/ }),
    ).toBeVisible();
  }

  async payFromInstallmentsDialog(): Promise<void> {
    await this.installmentsDialog
      .getByRole('button', { name: /ادفع ال[أآ]ن/ })
      .first()
      .click();
  }

  private get deliverySection(): Locator {
    return this.page.getByText('توصيل السيارة');
  }

  private get deliveryPickupAddress(): Locator {
    return this.page.locator('.delivery-input');
  }

  /**
   * A delivery booking carries the pickup location chosen during the search
   * through to the details page, so the section shows a real address rather
   * than the "choose a location" placeholder.
   */
  async expectDeliverySection(): Promise<void> {
    await expect(this.deliverySection.first()).toBeVisible({ timeout: 30_000 });
    await expect(this.deliveryPickupAddress.first()).toBeVisible();
    await expect(this.deliveryPickupAddress.first()).not.toHaveText(/حدد موقع الاستلام/);
  }

  async payNow(): Promise<void> {
    const button = this.payNowButton.first();
    await expect(button).toBeVisible({ timeout: 20_000 });
    await button.click();
  }

  async expectPendingRentalAlert(): Promise<void> {
    await expect(this.pendingRentalDialog).toBeVisible();
    await expect(
      this.pendingRentalDialog.getByText(/لا يمكنك الطلب حتى يتم تأكيد أو إلغاء طلبك/),
    ).toBeVisible();
    await expect(
      this.pendingRentalDialog.getByText('مشاهدة تفاصيل الحجز'),
    ).toBeVisible();
  }

  async expectPaymentSectionVisible(): Promise<void> {
    // No manual scrolling: the payment section re-renders while prices load, so
    // scrollIntoViewIfNeeded can act on a detached element. toBeVisible() waits
    // for a stable match and click() scrolls on its own.
    await expect(this.changePaymentMethodTrigger).toBeVisible({ timeout: 20_000 });
  }

  async openPaymentMethods(): Promise<void> {
    await this.expectPaymentSectionVisible();
    await this.changePaymentMethodTrigger.click();
    await expect(this.paymentDialog).toBeVisible();
  }

  async selectCreditCardPaymentMethod(): Promise<void> {
    // The Mada payment path currently fails finalization with a backend 500, so
    // pay with a credit card (Visa / Mastercard) instead.
    await this.openPaymentMethods();
    await this.paymentMethod('بطاقة ائتمان').click();
    await this.paymentDialog.getByRole('button', { name: 'إغلاق' }).click();
    await expect(this.paymentDialog).toBeHidden();
  }

  async expectCorePaymentMethods(): Promise<void> {
    // These online methods are offered on every branch. Apple Pay and Cash are
    // branch-conditional, so they are not asserted here.
    await expect(this.paymentMethod('مدى')).toBeVisible(); // Mada
    await expect(this.paymentMethod('بطاقة ائتمان')).toBeVisible(); // Visa / Mastercard
    await expect(this.paymentMethod(/تابي/)).toBeVisible(); // Tabby
    await expect(this.paymentMethod('3 دفعات بدون فوائد')).toBeVisible(); // Tamara
  }
}
