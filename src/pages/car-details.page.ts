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

  async expectPaymentSectionVisible(): Promise<void> {
    await this.changePaymentMethodTrigger.scrollIntoViewIfNeeded();
    await expect(this.changePaymentMethodTrigger).toBeVisible();
  }

  async openPaymentMethods(): Promise<void> {
    await this.expectPaymentSectionVisible();
    await this.changePaymentMethodTrigger.click();
    await expect(this.paymentDialog).toBeVisible();
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
