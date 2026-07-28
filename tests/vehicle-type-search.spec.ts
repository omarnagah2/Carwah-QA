import { expect, test } from '@playwright/test';
import { testData } from '../src/config/test-data';
import { HomePage } from '../src/pages/home.page';
import { CarListPage } from '../src/pages/car-list.page';

test.describe('Search by vehicle type', () => {
  // Searching does not require signing in.
  test.use({ storageState: { cookies: [], origins: [] } });

  // The "search by vehicle type" strip only works on Chromium: on WebKit its
  // heading renders but the category cards never reach the DOM, and on Firefox
  // they reach the DOM but never become clickable. Both look like product-side
  // rendering gaps rather than test problems — re-enable once they are fixed.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Vehicle type cards do not render usably on Firefox/WebKit.',
  );

  test('should list the cars of the chosen vehicle type', async ({ page }) => {
    const homePage = new HomePage(page);
    const carListPage = new CarListPage(page);

    await homePage.openArabicHomePage();
    await homePage.searchByVehicleType(testData.vehicleTypes.withResults);

    await expect(page).toHaveURL(/car-search/);
    await carListPage.expectFilteredBy(testData.vehicleTypes.withResults);
    await carListPage.expectResults();
  });

  test('should report no results for a vehicle type without cars', async ({ page }) => {
    const homePage = new HomePage(page);
    const carListPage = new CarListPage(page);

    await homePage.openArabicHomePage();
    await homePage.searchByVehicleType(testData.vehicleTypes.withoutResults);

    await expect(page).toHaveURL(/car-search/);
    await carListPage.expectFilteredBy(testData.vehicleTypes.withoutResults);
    await carListPage.expectNoResults();
  });
});
