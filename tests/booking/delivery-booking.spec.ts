import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/authenticated-test';
import { testData } from '../../src/config/test-data';
import { HomePage } from '../../src/pages/home.page';
import { selectPinnedCarAndBranch } from '../../src/utils/booking-navigation';
import { CarDetailsPage } from '../../src/pages/car-details.page';
import { CheckoutPage } from '../../src/pages/checkout.page';
import { MyRentalsPage } from '../../src/pages/my-rentals.page';

test.describe('Delivery booking', () => {
  // Creates a booking through the payment gateway, which is only reliable on
  // Chromium.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Booking creation via the payment gateway; verified on Chromium only.',
  );

  test.beforeEach(async ({ page }) => {
    test.setTimeout(300_000);
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  test.afterEach(async ({ page }) => {
    await new MyRentalsPage(page).cancelAllPendingReservations();
  });

  test('delivery booking', async ({ page }) => {
    const homePage = new HomePage(page);
    const carDetailsPage = new CarDetailsPage(page);
    const checkoutPage = new CheckoutPage(page);

    // 1-4. Home page -> delivery tab -> pick a location -> search.
    await homePage.openArabicHomePage();
    await homePage.searchWithDelivery();
    await expect(page).toHaveURL(/car-search/);

    // 5-6. The results are the usual listing, so take the same pinned car and
    //      branch every other booking type uses.
    await selectPinnedCarAndBranch(page);

    // 7. What makes this a delivery booking: the details page carries the
    //    pickup location chosen during the search.
    await carDetailsPage.expectDeliverySection();

    // Then the usual payment process.
    await carDetailsPage.selectCreditCardPaymentMethod();
    await carDetailsPage.payNow();
    await checkoutPage.payAndConfirm({
      holder: testData.payment.holder,
      number: testData.payment.visaNumber,
      expiry: testData.payment.expiry,
      cvv: testData.payment.cvv,
    });
  });
});
