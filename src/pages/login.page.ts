import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get phoneInput(): Locator {
    return this.loginDialog.locator('input[name="mobile"]');
  }

  private get otpInput(): Locator {
    return this.page
      .locator('input[autocomplete="one-time-code"]')
      .or(this.page.locator('input[name*="otp" i]'))
      .or(this.page.locator('input[name*="passcode" i]'))
      .first();
  }

  private get continueButton(): Locator {
    return this.loginDialog.locator('button[type="submit"]').first();
  }

  private get smsVerificationOption(): Locator {
    return this.loginDialog.locator('.icons .svg-wrap').nth(1);
  }

  private get headerLoginButton(): Locator {
    return this.page.locator('button.login-button').first();
  }

  private get loginDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  async open(): Promise<void> {
    // Wait for the DOM rather than the full load event: the live site pulls in
    // heavy third-party scripts that can delay the load event past the
    // navigation timeout on slower browsers. The assertions below already wait
    // for the elements we actually need.
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });

    // The header re-renders as the session state hydrates, so the login button
    // can detach mid-click. Wait for it, then retry once if the dialog does not
    // open on the first click.
    await expect(this.headerLoginButton).toBeVisible();

    try {
      await this.headerLoginButton.click();
      await expect(this.loginDialog).toBeVisible({ timeout: 10_000 });
    } catch {
      await this.headerLoginButton.click();
      await expect(this.loginDialog).toBeVisible({ timeout: 15_000 });
    }
  }

  async selectSmsVerification(): Promise<void> {
    await this.smsVerificationOption.click();
    await expect(this.smsVerificationOption).toHaveClass(/active/);
  }

  private async enterPhoneNumber(phoneNumber: string): Promise<void> {
    // Type through the locator (which focuses the field) rather than
    // page.keyboard, whose input WebKit occasionally drops when the click does
    // not land focus, leaving the field on just the "+966" prefix. Verify the
    // digits registered and re-enter once if they did not.
    const enter = async () => {
      await this.phoneInput.click();
      await this.phoneInput.press('End');
      await this.phoneInput.pressSequentially(phoneNumber, { delay: 30 });
    };

    await enter();

    try {
      await expect(this.phoneInput).not.toHaveValue(/^\+?966$/, { timeout: 3_000 });
    } catch {
      await this.phoneInput.fill('');
      await enter();
      await expect(this.phoneInput).not.toHaveValue(/^\+?966$/, { timeout: 5_000 });
    }
  }

  async requestOtp(phoneNumber: string): Promise<void> {
    await expect(this.phoneInput).toBeVisible();

    await this.selectSmsVerification();

    await this.enterPhoneNumber(phoneNumber);

    await expect(this.continueButton).toBeEnabled();

    await this.continueButton.click();
    await this.page.waitForTimeout(500);

    if (await this.phoneInput.isVisible()) {
      await this.continueButton.click();
    }

    await expect(this.phoneInput).toBeHidden({
      timeout: 30000,
    });
  }

  async waitForAutoFilledOtp(): Promise<void> {
    await expect(this.otpInput).toBeVisible({
      timeout: 30000,
    });

    await expect(this.otpInput).not.toHaveValue('', {
      timeout: 30000,
    });

    await expect(this.continueButton).toBeEnabled({
      timeout: 30000,
    });
  }

  async submitOtp(): Promise<void> {
    try {
      await this.continueButton.click({
        timeout: 5000,
      });
    } catch (error) {
      if (await this.loginDialog.isVisible()) {
        throw error;
      }
    }
  }

  async loginWithPhoneNumber(phoneNumber: string): Promise<void> {
    await this.open();

    await this.requestOtp(phoneNumber);

    await this.waitForAutoFilledOtp();

    await this.submitOtp();

    await expect(this.loginDialog).toBeHidden({
      timeout: 30000,
    });
  }
}
