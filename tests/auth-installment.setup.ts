import { test as setup } from '@playwright/test';
import { installmentAccount } from '../src/config/auth';
import { testData } from '../src/config/test-data';
import { authenticateAccount } from '../src/utils/authenticate-account';

setup('authenticate instalment user', async ({ page }) => {
  await authenticateAccount(
    page,
    testData.login.installmentPhoneNumber,
    installmentAccount,
  );
});
