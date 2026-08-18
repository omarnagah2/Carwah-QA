import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/authenticated-test';
import { goToDeliveryOptionalCarDetails } from '../../src/utils/booking-navigation';
import { CarDetailsPage } from '../../src/pages/car-details.page';
import { MyRentalsPage } from '../../src/pages/my-rentals.page';
import { paymentMethods } from '../../src/payments/payment-method';

/**
 * The same booking, paid for every way a customer can pay for it. The booking
 * type is held still — the delivery-optional car, reached the way every booking
 * spec reaches it — so the payment method is the only thing that varies.
 *
 * This replaces the per-method specs (mada-booking, tabby-booking), which were
 * the same journey copied once per provider. Visa is covered here as well as in
 * booking.spec.ts: this spec is the comparison across methods, that one is the
 * whole journey for a booking type.
 *
 * Deliberately not serial — a method that fails should not hide the result of
 * the ones after it. The suite's single worker is what keeps them sequential,
 * which the one-pending-reservation-per-customer rule requires.
 */
test.describe('Payment methods', () => {
  // Every method drives an external gateway, none of which is reliable on
  // Firefox/WebKit.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Payment gateways; Chromium only.');

  // Release whatever the test made. For Tabby this is the only route: the
  // returned page cannot render its own cancel link.
  test.afterEach(async ({ page }) => {
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  for (const method of paymentMethods) {
    test(`booking paid with ${method.name}`, async ({ page }) => {
      // A provider that cannot currently be driven end to end says so itself,
      // and is skipped with that reason rather than failing: an outage at the
      // provider is not a result about our code.
      test.skip(Boolean(method.blockedReason), method.blockedReason ?? '');
      test.setTimeout(300_000);
      const carDetails = new CarDetailsPage(page);

      // Business precondition, not something the test manages: Carwah blocks a
      // new booking while one is pending, which is a different scenario.
      expect(
        await new MyRentalsPage(page).pendingReservationCount(),
        'account must have no pending reservation before booking',
      ).toBe(0);

      await goToDeliveryOptionalCarDetails(page);

      await method.select(page);
      await carDetails.payNow();
      await method.complete(page);
      await method.expectSuccess(page);

      // Release it the way a customer would, where the method leaves that open.
      if (method.releasableFromSuccess) {
        await carDetails.openRentalDetailsFromSuccess();
        await carDetails.cancelReservation();
      }
    });
  }
});
