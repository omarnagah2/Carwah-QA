import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/authenticated-test';
import { testData } from '../../src/config/test-data';
import { goToDeliveryOptionalCarDetails } from '../../src/utils/booking-navigation';
import { CarDetailsPage } from '../../src/pages/car-details.page';
import { CheckoutPage } from '../../src/pages/checkout.page';
import { MyRentalsPage } from '../../src/pages/my-rentals.page';

test.describe('Mada booking', () => {
  // Drives the HyperPay widget and 3-D Secure; only reliable on Chromium.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Payment gateway; Chromium only.');

  // Release the booking this test makes. Asserting the precondition without
  // clearing up afterwards left the reservation behind, which then failed the
  // next test that asserts the same precondition.
  test.afterEach(async ({ page }) => {
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  test('mada booking', async ({ page }) => {
    test.setTimeout(300_000);
    // Business precondition: Carwah blocks a new booking while one is pending.
    expect(
      await new MyRentalsPage(page).pendingReservationCount(),
      'account must have no pending reservation before booking',
    ).toBe(0);
    const details = new CarDetailsPage(page);
    const checkout = new CheckoutPage(page);
    await goToDeliveryOptionalCarDetails(page);
    await details.selectMadaPaymentMethod();
    await details.payNow();
    await checkout.payAndConfirm({
      holder: testData.payment.holder,
      number: testData.payment.madaNumber,
      expiry: testData.payment.expiry,
      cvv: testData.payment.cvv,
    });
  });
});
