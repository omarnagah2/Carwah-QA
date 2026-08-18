import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { TestCard } from './checkout.page';

/**
 * Tamara's hosted sandbox checkout.
 *
 * Two things set it apart from Tabby's, and both shape this class:
 *
 * - It opens in a **new browser tab**, so the caller hands the popup in rather
 *   than driving the page the booking started on. `waitForTamaraCheckout`
 *   finds it.
 * - Several steps are **first-time only** for a given phone number: the terms
 *   dialog and the whole identity check are skipped once Tamara knows the
 *   customer. Both are therefore conditional, not assumed.
 */
export class TamaraCheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * The path, never the whole URL.
   *
   * The host is `checkout-sandbox.tamara.co`, so a pattern containing
   * "checkout" matches the *hostname* and reports a page that was never
   * reached — which is exactly how this was first written, and wrong.
   */
  private get currentPath(): string {
    try {
      return new URL(this.page.url()).pathname;
    } catch {
      return '';
    }
  }

  /** Poll the path: Tamara's pages do not reliably fire `load`. */
  private async waitForPath(pattern: RegExp, seconds = 90): Promise<boolean> {
    for (let index = 0; index < seconds; index += 1) {
      if (this.page.isClosed()) {
        return false;
      }
      if (pattern.test(this.currentPath)) {
        return true;
      }
      await this.page.waitForTimeout(1_000);
    }
    return false;
  }

  private get phoneInput(): Locator {
    return this.page.locator('#input-phone-number');
  }

  private get sendCodeButton(): Locator {
    return this.page.getByRole('button', { name: 'أرسل الرمز' });
  }

  private get agreeToTermsButton(): Locator {
    return this.page.getByRole('button', { name: 'يوافق' });
  }

  /**
   * The four boxes on screen are decorative: one hidden input sits over them
   * and takes every keystroke, and clicking a visible box hits that overlay.
   */
  private get otpInput(): Locator {
    return this.page.locator('input.hidden-otp-input');
  }

  private get nonCitizenAutofillButton(): Locator {
    return this.page.getByRole('button', { name: /Non-?Citizen/i });
  }

  private get continueButton(): Locator {
    return this.page.getByRole('button', { name: 'استمرار' });
  }

  private get proceedToPaymentButton(): Locator {
    return this.page.getByRole('button', { name: 'متابعة الدفع' });
  }

  private get payButton(): Locator {
    // Labelled with the instalment amount, which depends on the booking.
    return this.page.getByRole('button', { name: /ادفع/ });
  }

  /**
   * The card form is Checkout.com Frames v2: three separate iframes, each
   * identified by the `element=` parameter in its src. Every frame also holds
   * navigation and autofill helpers, so the real field is taken by its id.
   */
  private cardField(element: string, id: string): Locator {
    return this.page.frameLocator(`iframe[src*="element=${element}"]`).locator(id);
  }

  async expectOnTamara(): Promise<void> {
    expect(await this.waitForPath(/^\/login/, 60), 'should open Tamara checkout').toBe(true);
    await expect(this.phoneInput).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Sign in with the sandbox customer.
   *
   * The field arrives pre-filled with the number the booking was made under,
   * so it has to be cleared: typing on top of it leaves Tamara signing in as
   * the Carwah customer instead, which then skips the steps this is here to
   * cover.
   */
  async signIn(phoneNumber: string): Promise<void> {
    await this.phoneInput.click();
    await this.phoneInput.fill('');
    await expect(this.phoneInput).toHaveValue('');
    await this.phoneInput.pressSequentially(phoneNumber, { delay: 90 });
    await expect(this.phoneInput).toHaveValue(new RegExp(`${phoneNumber}$`));

    await this.sendCodeButton.click();

    // Shown only for a number Tamara has not onboarded yet.
    await this.page.waitForTimeout(3_000);
    if ((await this.agreeToTermsButton.count()) > 0) {
      await this.agreeToTermsButton.first().click();
      await this.page.waitForTimeout(2_500);
    }
  }

  /**
   * Enter the one-time code. There is nothing to intercept or wait for: the
   * sandbox prints the code on the page itself.
   */
  async enterOtp(): Promise<void> {
    const body = await this.page.locator('body').innerText();
    const code = body.match(/Code:\s*(\d+)/i)?.[1];
    expect(code, 'the sandbox should print the OTP on the page').toBeTruthy();

    await this.otpInput.click();
    await this.otpInput.pressSequentially(code as string, { delay: 220 });
  }

  /**
   * Identity verification, which Tamara asks for only the first time it sees a
   * customer. The sandbox fills it from a button that, as the page says itself,
   * exists only outside production.
   */
  async completeIdentityCheckIfAsked(): Promise<void> {
    expect(
      await this.waitForPath(/^\/(kyc|checkout)/, 90),
      'the OTP should lead to identity checks or the plans',
    ).toBe(true);

    if (!/^\/kyc/.test(this.currentPath)) {
      return;
    }

    await this.nonCitizenAutofillButton.first().click();
    await this.page.waitForTimeout(2_000);
    await this.continueButton.first().click();
    expect(
      await this.waitForPath(/^\/checkout/, 90),
      'identity checks should lead to the plans',
    ).toBe(true);
  }

  /**
   * Take the instalment plan and go on to pay.
   *
   * The plan tiles are deliberately left alone: one arrives selected, and
   * clicking a tile sends the sandbox to Tamara's maintenance page rather than
   * changing the plan.
   */
  async continueWithSelectedPlan(): Promise<void> {
    await expect(this.proceedToPaymentButton.first()).toBeVisible({ timeout: 30_000 });
    await this.proceedToPaymentButton.first().click();
  }

  /** Pay the first instalment with a card. */
  async payFirstInstalment(card: TestCard): Promise<void> {
    const number = this.cardField('card-number', '#checkout-frames-card-number');
    await expect(number).toBeVisible({ timeout: 30_000 });
    await number.click();
    await number.pressSequentially(card.number, { delay: 60 });

    const expiry = this.cardField('expiry-date', '#checkout-frames-expiry-date');
    await expiry.click();
    await expiry.pressSequentially(card.expiry, { delay: 90 });

    const cvv = this.cardField('cvv', '#checkout-frames-cvv');
    await cvv.click();
    await cvv.pressSequentially(card.cvv, { delay: 60 });

    await expect(this.payButton.first()).toBeEnabled({ timeout: 20_000 });
    await this.payButton.first().click();
  }

  /**
   * Tamara's generic error page, which the sandbox has been redirecting to at
   * the payment step. Recognising it turns "some assertion timed out" into a
   * failure that says the provider fell over.
   */
  async expectNotOnMaintenancePage(): Promise<void> {
    await expect(
      this.page,
      'Tamara redirected to its maintenance page — the sandbox rejected the payment',
    ).not.toHaveURL(/tamara\.co\/.*maintenance/i);
  }
}

/**
 * Tamara opens in a new tab, so it has to be picked out of the context rather
 * than followed from the page the booking started on.
 */
export async function waitForTamaraCheckout(page: Page, timeoutMs = 60_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const popup = page
      .context()
      .pages()
      .find((candidate) => candidate !== page && /tamara\.co/i.test(candidate.url()));
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
      return popup;
    }
    await page.waitForTimeout(500);
  }

  throw new Error('Tamara checkout never opened in a new tab.');
}
