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
}
