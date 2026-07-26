import { test } from '../src/fixtures/authenticated-test';
import { HomePage } from '../src/pages/home.page';

test.describe('Logout', () => {
  test('should return to a logged-out state after logging out', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.openHomePage();

    await homePage.logout();

    await homePage.expectLoggedOut();
  });
});
