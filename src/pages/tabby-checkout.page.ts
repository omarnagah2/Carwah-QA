import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/** Tabby's hosted checkout: OTP, then the instalment plan, then back to Carwah. */
export class TabbyCheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get otpInput(): Locator {
    return this.page.locator('input[name="otp-code"]');
  }

  private get continueButton(): Locator {
    return this.page.locator('button').filter({ hasText: /استمرار|Continue/ }).last();
  }

  /** Poll the URL: Tabby's pages do not reliably fire `load`. */
  private async waitForUrl(pattern: RegExp, seconds = 40): Promise<boolean> {
    for (let i = 0; i < seconds; i += 1) {
      if (pattern.test(this.page.url())) return true;
      await this.page.waitForTimeout(1_000);
    }
    return false;
  }

  async expectOnTabby(): Promise<void> {
    expect(await this.waitForUrl(/checkout\.tabby\.sa/i), 'should redirect to Tabby').toBe(true);
    await expect(this.otpInput).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Type the code as a customer would. Tabby submits by itself on the fourth
   * digit, so there is no Continue to press here.
   */
  async enterOtp(code: string): Promise<void> {
    await this.otpInput.click();
    await this.otpInput.pressSequentially(code, { delay: 250 });
    expect(await this.waitForUrl(/payment-plans/i), 'OTP should open the plans page').toBe(true);
    await this.page.waitForTimeout(4_000);
  }

  /** Continue with the pre-selected plan, then let Tabby hand back to Carwah. */
  async confirmInstalmentPlan(): Promise<void> {
    await expect(this.continueButton).toBeEnabled({ timeout: 30_000 });
    await this.continueButton.click();
  }

  /**
   * Tabby hands back to **https** while the GraphQL API is http, so Chromium
   * blocks every call on the returned page as mixed content and the success
   * dialog never gets its data. The booking is made — the URL carries its id —
   * but the page cannot render it, and that is a product issue rather than
   * something for this test to route around.
   *
   * So the outcome is read from the URL. Re-opening the same address over http
   * does render the dialog, but rewriting the scheme here would assert an
   * experience no customer has and bury the defect; the cancel journey the card
   * specs use is unavailable for the same reason, which is why this spec still
   * releases its booking through the `afterEach` sweep.
   */
  async expectReturnedToCarwahWithSuccess(): Promise<void> {
    expect(await this.waitForUrl(/carwah\.co/i, 90), 'should return to Carwah').toBe(true);
    await expect(this.page).toHaveURL(/status=success/);
    await expect(this.page).toHaveURL(/bookingId=\d+/);
  }
}
