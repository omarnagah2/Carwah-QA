import { expect, test } from '@playwright/test';
import { testData } from '../src/config/test-data';
import { LoginPage } from '../src/pages/login.page';

test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should login using auto-filled OTP', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.open();

    await loginPage.requestOtp(
      testData.login.phoneNumber
    );

    await loginPage.waitForAutoFilledOtp();

    await loginPage.submitOtp();

    await expect(page).not.toHaveURL(/login|sign-in/i);
  });
});
