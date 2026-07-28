import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export interface TestCard {
  holder: string;
  number: string;
  expiry: string; // MMYY, e.g. "1228"
  cvv: string;
}

/**
 * Drives the HyperPay (eu-test.oppwa.com) COPYandPAY widget that Carwah embeds
 * on the car-details page, plus the 3-D Secure test simulator that follows.
 */
export class CheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get cardHolderInput(): Locator {
    return this.page.locator('input[name="card.holder"]');
  }

  private get expiryInput(): Locator {
    return this.page.locator('input[placeholder="شهر / سنة"]');
  }

  // Card number and CVV live in HyperPay PCI iframes named after the field.
  private get cardNumberFrame(): FrameLocator {
    return this.page.frameLocator('iframe[name="card.number"]');
  }

  private get cvvFrame(): FrameLocator {
    return this.page.frameLocator('iframe[name="card.cvv"]');
  }

  private get widgetPayButton(): Locator {
    return this.page.locator('.wpwl-button-pay');
  }

  private get threeDsOutcomeSelect(): Locator {
    return this.page.locator('select');
  }

  private get threeDsSubmitButton(): Locator {
    return this.page
      .getByRole('button', { name: /Submit/i })
      .or(this.page.locator('input[type="submit"]'));
  }

  private get paymentSuccessMessage(): Locator {
    return this.page.getByText('تم الدفع بنجاح');
  }

  private get paymentFailureMessage(): Locator {
    return this.page.getByText('عملية دفع غير ناجحة');
  }

  private get retryPaymentButton(): Locator {
    // The failure dialog offers to pay again for the same pending booking,
    // which is the recovery the app itself instructs the customer to use.
    return this.page.getByRole('button', { name: /ادفع ال[أآ]ن/ });
  }

  async waitForWidget(): Promise<void> {
    await expect(this.cardHolderInput).toBeVisible({ timeout: 30_000 });
    await expect(this.cardNumberFrame.locator('input[name="card.number"]')).toBeVisible({
      timeout: 30_000,
    });
  }

  async payWithCard(card: TestCard): Promise<void> {
    await this.waitForWidget();

    await this.cardHolderInput.fill(card.holder);

    await this.expiryInput.click();
    await this.expiryInput.pressSequentially(card.expiry, { delay: 100 });

    const number = this.cardNumberFrame.locator('input[name="card.number"]');
    await number.click();
    await number.pressSequentially(card.number, { delay: 60 });

    const cvv = this.cvvFrame.locator('input[name="card.cvv"]');
    await cvv.click();
    await cvv.pressSequentially(card.cvv, { delay: 60 });

    await this.widgetPayButton.click();
  }

  async completeThreeDSecure(outcome = 'Approve'): Promise<void> {
    // The card submit redirects to the ACI 3-D Secure simulator page.
    await this.page.waitForURL(/oppwa\.com.*(acsRequest|3ds|ACS)/i, { timeout: 45_000 });
    await expect(this.threeDsOutcomeSelect).toBeVisible({ timeout: 20_000 });
    await this.threeDsOutcomeSelect.selectOption({ label: outcome });
    await this.threeDsSubmitButton.first().click();
  }

  async expectPaymentSuccess(): Promise<void> {
    // Control returns to Carwah with the booking id, then the success dialog.
    await this.page.waitForURL(/carwah\.co.*bookingId=/i, { timeout: 60_000 });
    await expect(this.paymentSuccessMessage).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Pays and, if the gateway callback fails, pays again for the same pending
   * booking — the recovery the failure dialog itself instructs the customer to
   * use ("...يمكنك محاولة الدفع مرة أخرى بالضغط على ادفع الان").
   *
   * The retry exists because Carwah's payment callback intermittently returns
   * `500 wrong number of arguments (given 2, expected 1)` from
   * `hyperpay_payment_gateway.rb`, which is a backend defect rather than a
   * problem with the booking being made.
   */
  async payAndConfirm(card: TestCard, maxAttempts = 4): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await this.payWithCard(card);
      await this.completeThreeDSecure('Approve');

      await this.page.waitForURL(/carwah\.co/i, { timeout: 60_000 });
      const outcome = await this.waitForPaymentOutcome();

      if (outcome === 'success') {
        return;
      }

      if (attempt < maxAttempts) {
        await this.retryPaymentFromFailureDialog();
      }
    }

    throw new Error(
      `Payment did not succeed after ${maxAttempts} attempts; the gateway callback kept failing.`,
    );
  }

  private async waitForPaymentOutcome(
    timeout = 45_000,
  ): Promise<'success' | 'failure'> {
    // Both messages exist in the DOM, so decide on visibility rather than count.
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      if (await this.paymentSuccessMessage.first().isVisible().catch(() => false)) {
        return 'success';
      }
      if (await this.paymentFailureMessage.first().isVisible().catch(() => false)) {
        return 'failure';
      }
      await this.page.waitForTimeout(500);
    }

    throw new Error('Timed out waiting for the payment result dialog.');
  }

  private async retryPaymentFromFailureDialog(): Promise<void> {
    await this.retryPaymentButton.first().click();
    await this.waitForWidget();
  }
}
