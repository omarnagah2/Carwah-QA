import { expect, test } from '@playwright/test';
import { testData } from '../src/config/test-data';
import { HomePage } from '../src/pages/home.page';
import { CarListPage } from '../src/pages/car-list.page';
import { CarBranchesPage } from '../src/pages/car-branches.page';
import { CarDetailsPage } from '../src/pages/car-details.page';

test.describe('Create booking', () => {
  // The booking flow up to payment-method selection works without signing in.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should reach the car details payment methods after searching a city and picking a car and branch', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const carListPage = new CarListPage(page);
    const carBranchesPage = new CarBranchesPage(page);
    const carDetailsPage = new CarDetailsPage(page);

    await homePage.openArabicHomePage();
    await homePage.expectValidRentalDuration();
    await homePage.searchCarsInCity(testData.booking.city);

    await carListPage.expectLoaded();
    await carListPage.selectFirstCar();

    await carBranchesPage.expectLoaded();
    await carBranchesPage.selectFirstBranch();

    await expect(page).toHaveURL(/car-details/);

    await carDetailsPage.openPaymentMethods();
    await carDetailsPage.expectCorePaymentMethods();
  });
});
