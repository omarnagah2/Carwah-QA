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
    await this.page.goto('/');
    await this.headerLoginButton.click();
    await expect(this.loginDialog).toBeVisible();
  }

  async selectSmsVerification(): Promise<void> {
    await this.smsVerificationOption.click();
    await expect(this.smsVerificationOption).toHaveClass(/active/);
  }

  async requestOtp(phoneNumber: string): Promise<void> {
    await expect(this.phoneInput).toBeVisible();

    await this.selectSmsVerification();

    await this.phoneInput.click();
    await this.page.keyboard.press('End');
    await this.page.keyboard.type(phoneNumber);

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
