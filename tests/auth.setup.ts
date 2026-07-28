import { test as setup } from '@playwright/test';
import { primaryAccount } from '../src/config/auth';
import { testData } from '../src/config/test-data';
import { authenticateAccount } from '../src/utils/authenticate-account';

setup('authenticate user', async ({ page }) => {
  await authenticateAccount(page, testData.login.phoneNumber, primaryAccount);
});
