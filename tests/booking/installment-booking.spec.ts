import { createAuthenticatedTest } from '../../src/fixtures/authenticated-test';
import { installmentAccount } from '../../src/config/auth';
import { testData } from '../../src/config/test-data';
import { CarDetailsPage } from '../../src/pages/car-details.page';
import { CheckoutPage } from '../../src/pages/checkout.page';
import { MyRentalsPage } from '../../src/pages/my-rentals.page';
import { goToRentalPackageCarDetails } from '../../src/utils/booking-navigation';

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
    const checkoutPage = new CheckoutPage(page);

    await goToRentalPackageCarDetails(page);

    // The period chosen on the home page is carried through as the selected
    // rental package, which is what ties the monthly search to this booking.
    await carDetailsPage.expectRentalPackageSelected(testData.booking.monthsLabel);

    await carDetailsPage.proceedToInstallments();
    await carDetailsPage.expectInstallmentsDialog();

    // Mada finalization currently fails with a backend 500, so pay by card.
    await carDetailsPage.selectCreditCardPaymentMethod();
    await carDetailsPage.payFromInstallmentsDialog();

    // Same payment helper as the normal booking: fills the HyperPay widget,
    // approves 3-D Secure, and asserts the success alert (retrying the gateway
    // callback when it returns the intermittent backend 500).
    await checkoutPage.payAndConfirm({
      holder: testData.payment.holder,
      number: testData.payment.visaNumber,
      expiry: testData.payment.expiry,
      cvv: testData.payment.cvv,
    });

    // Release the booking the way a customer would: through the success dialog
    // into the booking's own page. `afterEach` remains the safety net.
    await carDetailsPage.openRentalDetailsFromSuccess();
    await carDetailsPage.cancelReservation();
  });
});
