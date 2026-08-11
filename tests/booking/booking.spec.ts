import { expect, test } from '@playwright/test';
import { test as authTest } from '../../src/fixtures/authenticated-test';
import { testData } from '../../src/config/test-data';
import { HomePage } from '../../src/pages/home.page';
import { CarListPage } from '../../src/pages/car-list.page';
import { CarBranchesPage } from '../../src/pages/car-branches.page';
import { CarDetailsPage } from '../../src/pages/car-details.page';
import { CheckoutPage } from '../../src/pages/checkout.page';
import { MyRentalsPage } from '../../src/pages/my-rentals.page';
import { goToDeliveryOptionalCarDetails } from '../../src/utils/booking-navigation';
import { defaultPaymentMethod } from '../../src/payments/payment-method';

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
    await homePage.selectCity(testData.booking.city);
    await homePage.selectRentalDuration(testData.booking.duration);
    await homePage.submitSearch();

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

    await goToDeliveryOptionalCarDetails(page);

    // On the default card: what this test covers is the booking, not the
    // payment method. Every method is compared in payment-methods.spec.ts.
    await defaultPaymentMethod.select(page);
    await carDetailsPage.payNow();
    await defaultPaymentMethod.complete(page);
    await defaultPaymentMethod.expectSuccess(page);

    // Follow the success dialog to the booking it created and release it, which
    // is the journey a customer takes. `afterEach` stays as the safety net for
    // a run that fails before reaching here.
    await carDetailsPage.openRentalDetailsFromSuccess();
    await carDetailsPage.cancelReservation();
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
