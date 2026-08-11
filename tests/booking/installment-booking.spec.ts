import { createAuthenticatedTest } from '../../src/fixtures/authenticated-test';
import { installmentAccount } from '../../src/config/auth';
import { testData } from '../../src/config/test-data';
import { CarDetailsPage } from '../../src/pages/car-details.page';
import { MyRentalsPage } from '../../src/pages/my-rentals.page';
import { goToRentalPackageCarDetails } from '../../src/utils/booking-navigation';
import { defaultPaymentMethod } from '../../src/payments/payment-method';

// `installmentAccount` is an alias of `primaryAccount`, not a second customer.
// This booking therefore shares the one-pending-reservation-per-customer rule
// with every other booking spec, so this file must not run alongside them —
// which the suite's single worker is what ensures.
const test = createAuthenticatedTest(installmentAccount.sessionFile);

test.describe('Installment booking', () => {
  test.use({ storageState: installmentAccount.storageState });

  // Drives an external payment gateway and picks a car out of a lazily
  // rendered, reflowing grid, which is flaky on Firefox/WebKit.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Booking creation via the payment gateway; verified on Chromium only.',
  );

  test.beforeEach(async ({ page }) => {
    test.setTimeout(240_000);
    // Only one pending booking is allowed per customer, and a leftover one
    // would surface the pending alert instead of the gateway.
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  test.afterEach(async ({ page }) => {
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  test('installment booking', async ({ page }) => {
    const carDetailsPage = new CarDetailsPage(page);

    await goToRentalPackageCarDetails(page);

    // The period chosen on the home page is carried through as the selected
    // rental package, which is what ties the monthly search to this booking.
    await carDetailsPage.expectRentalPackageSelected(testData.booking.monthsLabel);

    await carDetailsPage.proceedToInstallments();
    await carDetailsPage.expectInstallmentsDialog();

    // On the default card, like every other booking type: what this test covers
    // is the instalment journey, not the payment method.
    await defaultPaymentMethod.select(page);
    await carDetailsPage.payFromInstallmentsDialog();
    await defaultPaymentMethod.complete(page);
    await defaultPaymentMethod.expectSuccess(page);

    // Release the booking the way a customer would: through the success dialog
    // into the booking's own page. `afterEach` remains the safety net.
    await carDetailsPage.openRentalDetailsFromSuccess();
    await carDetailsPage.cancelReservation();
  });
});
