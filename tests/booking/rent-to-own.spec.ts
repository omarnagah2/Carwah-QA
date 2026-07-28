import { readFileSync } from 'node:fs';
import { expect, type Browser, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/authenticated-test';
import { installmentAccount } from '../../src/config/auth';
import { testData } from '../../src/config/test-data';
import { HomePage } from '../../src/pages/home.page';
import { RentToOwnPage } from '../../src/pages/rent-to-own.page';
import { CarDetailsPage } from '../../src/pages/car-details.page';
import { CheckoutPage } from '../../src/pages/checkout.page';
import { MyRentalsPage } from '../../src/pages/my-rentals.page';

/** A page signed in as a different customer, to check what they can see. */
async function openAsOtherCustomer(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    storageState: installmentAccount.storageState,
  });
  const page = await context.newPage();
  const sessionStorage = JSON.parse(readFileSync(installmentAccount.sessionFile, 'utf-8'));
  await page.addInitScript((storage: Record<string, string>) => {
    if (window.location.hostname !== 'prewebsite.carwah.co') {
      return;
    }
    for (const [key, value] of Object.entries(storage)) {
      window.sessionStorage.setItem(key, value);
    }
  }, sessionStorage);
  return page;
}

test.describe('Rent to own booking', () => {
  // Creates a booking through the payment gateway and reads a lazily rendered
  // listing, both of which are only reliable on Chromium.
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

  test('rent to own booking', async ({ page, browser }) => {
    const homePage = new HomePage(page);
    const rentToOwn = new RentToOwnPage(page);
    const carDetailsPage = new CarDetailsPage(page);
    const checkoutPage = new CheckoutPage(page);
    const myRentals = new MyRentalsPage(page);

    // 1-4. Home page banner -> rent to own listing, split into new and used.
    await homePage.openArabicHomePage();
    await rentToOwn.openFromHomeBanner();
    await expect(page).toHaveURL(/rent-to-own/);
    await rentToOwn.expectLoaded();

    // 5. Take a car from the "new" section and open its contract options. A
    //    named car rather than the first one, because some branches demand a
    //    delivery location before they accept payment.
    await rentToOwn.selectSection('new');
    const carName = await rentToOwn.resolveListedCarName(testData.rentToOwn.car);
    const carId = await rentToOwn.openCar(carName);
    await rentToOwn.expectCarBookable();

    // 6. The contract duration hands over to the usual details page, so the
    //    booking is paid for with the same flow as every other booking type.
    await rentToOwn.selectDurationPlan();
    await carDetailsPage.selectCreditCardPaymentMethod();
    await carDetailsPage.payNow();
    await checkoutPage.payAndConfirm({
      holder: testData.payment.holder,
      number: testData.payment.visaNumber,
      expiry: testData.payment.expiry,
      cvv: testData.payment.cvv,
    });

    // 7 + first extra check: a booked car leaves the listing.
    await rentToOwn.open();
    await rentToOwn.selectSection('new');
    await rentToOwn.expectCarNotListed(carName);

    // Second extra check: it is gone for other customers too, and its own page
    // no longer offers a contract to book.
    const otherCustomerPage = await openAsOtherCustomer(browser);
    try {
      const otherCustomerView = new RentToOwnPage(otherCustomerPage);
      await otherCustomerView.open();
      await otherCustomerView.selectSection('new');
      await otherCustomerView.expectCarNotListed(carName);

      await otherCustomerPage.goto(`/ar/rent-to-own-cars/${carId}`, {
        waitUntil: 'domcontentloaded',
      });
      await otherCustomerView.expectCarNotBookable();
    } finally {
      await otherCustomerPage.context().close();
    }

    // Third extra check: cancelling the booking releases the car again.
    await myRentals.cancelAllPendingReservations();
    await rentToOwn.open();
    await rentToOwn.selectSection('new');
    await rentToOwn.expectCarListed(carName);
  });
});
