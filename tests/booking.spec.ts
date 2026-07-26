import { expect, test } from '@playwright/test';
import { test as authTest } from '../src/fixtures/authenticated-test';
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

authTest.describe('Create booking - pending rental', () => {
  // This is an account-level business rule, not browser-specific UI, and
  // reliably selecting the delivery-optional car from the lazily-rendered,
  // reflowing car grid is flaky on Firefox/WebKit. Run it on Chromium only.
  authTest.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Account-level rule; verified on Chromium only.',
  );

  // Precondition: the signed-in account must already have a pending booking.
  // Carwah allows only one pending booking at a time, so paying for another one
  // surfaces the "حجز قيد الإنتظار" alert instead of proceeding to checkout.
  // If the account's pending booking is confirmed or cancelled, this scenario no
  // longer applies and the pay action would continue to the payment gateway.
  authTest(
    'should warn that a booking is already pending when paying with an existing pending rental',
    async ({ page }) => {
      const homePage = new HomePage(page);
      const carListPage = new CarListPage(page);
      const carBranchesPage = new CarBranchesPage(page);
      const carDetailsPage = new CarDetailsPage(page);

      await homePage.openArabicHomePage();
      await homePage.searchCarsInCity(testData.booking.city);

      await carListPage.expectLoaded();
      // This car's branch does not require a delivery location, so pay can be
      // reached directly and the pending-rental check runs when paying.
      await carListPage.selectCarByName(testData.booking.car);

      await carBranchesPage.expectLoaded();
      await carBranchesPage.selectFirstBranch();

      await expect(page).toHaveURL(/car-details/);

      await carDetailsPage.payNow();

      await carDetailsPage.expectPendingRentalAlert();
    },
  );
});
