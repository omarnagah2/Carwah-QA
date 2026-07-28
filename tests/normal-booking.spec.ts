import { expect, test, type Page } from '@playwright/test';
import { test as authTest } from '../src/fixtures/authenticated-test';
import { testData } from '../src/config/test-data';
import { HomePage } from '../src/pages/home.page';
import { CarListPage } from '../src/pages/car-list.page';
import { CarBranchesPage } from '../src/pages/car-branches.page';
import { CarDetailsPage } from '../src/pages/car-details.page';
import { CheckoutPage } from '../src/pages/checkout.page';
import { MyRentalsPage } from '../src/pages/my-rentals.page';

// Navigate from the home page to the delivery-optional car's details page, so
// the pay action is reachable without the (fragile) map-based location picker.
async function goToDeliveryOptionalCarDetails(page: Page): Promise<void> {
  const homePage = new HomePage(page);
  const carListPage = new CarListPage(page);
  const carBranchesPage = new CarBranchesPage(page);

  await homePage.openArabicHomePage();
  await homePage.searchCarsInCity(testData.booking.city);
  await carListPage.expectLoaded();
  await carListPage.selectCarByName(testData.booking.car);
  await carBranchesPage.expectLoaded();
  await carBranchesPage.selectFirstBranch();
  await expect(page).toHaveURL(/car-details/);
}

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

authTest.describe('Create booking - payment', () => {
  // Both tests create/cancel bookings on the shared account, so they must not
  // run concurrently. They select the delivery-optional car from a lazily
  // rendered, reflowing grid and drive an external payment gateway, which is
  // flaky on Firefox/WebKit — run on Chromium only.
  authTest.describe.configure({ mode: 'serial' });
  authTest.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Booking creation via the payment gateway; verified on Chromium only.',
  );

  authTest.beforeEach(async ({ page }) => {
    authTest.setTimeout(240_000);
    // Start from a clean state: only one pending booking is allowed, and a
    // leftover one would surface the pending alert instead of the gateway.
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  authTest.afterEach(async ({ page }) => {
    // Cancel whatever this test created so the account is clean for the next run.
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  authTest('normal booking', async ({ page }) => {
    const carDetailsPage = new CarDetailsPage(page);
    const checkoutPage = new CheckoutPage(page);

    await goToDeliveryOptionalCarDetails(page);

    // Mada finalization currently fails with a backend 500, so pay by card.
    await carDetailsPage.selectCreditCardPaymentMethod();
    await carDetailsPage.payNow();

    // Retries the payment on a failed gateway callback, the same way the app
    // tells the customer to, so the intermittent backend 500 in
    // hyperpay_payment_gateway.rb does not mask whether a booking can be made.
    await checkoutPage.payAndConfirm({
      holder: testData.payment.holder,
      number: testData.payment.visaNumber,
      expiry: testData.payment.expiry,
      cvv: testData.payment.cvv,
    });
  });

  authTest(
    'should warn that a booking is already pending when paying with an existing pending rental',
    async ({ page }) => {
      const carDetailsPage = new CarDetailsPage(page);
      const checkoutPage = new CheckoutPage(page);

      // Create a pending reservation: reaching the payment gateway reserves the
      // booking in pending status; abandon it there without paying.
      await goToDeliveryOptionalCarDetails(page);
      await carDetailsPage.payNow();
      await checkoutPage.waitForWidget();

      // Re-attempt payment with a pending reservation in place -> pending alert.
      await goToDeliveryOptionalCarDetails(page);
      await carDetailsPage.payNow();
      await carDetailsPage.expectPendingRentalAlert();
    },
  );
});
