import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test as setup } from '@playwright/test';
import { authFile, authSessionFile } from '../src/config/auth';
import { testData } from '../src/config/test-data';
import { LoginPage } from '../src/pages/login.page';

setup('authenticate user', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.loginWithPhoneNumber(testData.login.phoneNumber);

  mkdirSync(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });

  const sessionStorage = await page.evaluate(() => JSON.stringify(window.sessionStorage));
  writeFileSync(authSessionFile, sessionStorage, 'utf-8');
});
