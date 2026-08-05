import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/authenticated-test';
import { goToDeliveryOptionalCarDetails } from '../../src/utils/booking-navigation';
import { CarDetailsPage } from '../../src/pages/car-details.page';
import { TabbyCheckoutPage } from '../../src/pages/tabby-checkout.page';
import { MyRentalsPage } from '../../src/pages/my-rentals.page';

test.describe('Tabby booking', () => {
  // Drives Tabby's hosted checkout; only reliable on Chromium.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Payment gateway; Chromium only.');

  // Release the booking this test makes, so the next test that asserts the
  // zero-pending precondition is not blocked by it.
  test.afterEach(async ({ page }) => {
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  test('tabby booking', async ({ page }) => {
    test.setTimeout(300_000);
    const myRentals = new MyRentalsPage(page);
    const carDetails = new CarDetailsPage(page);
    const tabby = new TabbyCheckoutPage(page);

    // Precondition, not something the test manages: Carwah blocks a new booking
    // while one is pending, which is a different scenario altogether.
    expect(
      await myRentals.pendingReservationCount(),
      'account must have no pending reservation before booking',
    ).toBe(0);

    await goToDeliveryOptionalCarDetails(page);
    await carDetails.selectTabbyPaymentMethod();
    await carDetails.payNow();

    await tabby.expectOnTabby();
    await tabby.enterOtp('8888');
    await tabby.confirmInstalmentPlan();

    await tabby.expectReturnedToCarwahWithSuccess();
  });
});
