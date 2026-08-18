import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/authenticated-test';
import { testData } from '../../src/config/test-data';
import { HomePage } from '../../src/pages/home.page';
import { CarListPage } from '../../src/pages/car-list.page';
import { CarBranchesPage } from '../../src/pages/car-branches.page';
import { CarDetailsPage, tamaraPaymentLabel } from '../../src/pages/car-details.page';
import { goToDeliveryOptionalCarDetails } from '../../src/utils/booking-navigation';

/**
 * Tamara is offered only while the booking total sits between limits held in
 * Firebase Remote Config — `tamara_min_limit_value` and `tamara_max_limit_value`,
 * mirrored in `testData.tamara`. Outside them the dialog keeps the row and
 * refuses the click.
 *
 * Neither test pays for anything: both stop at the payment dialog, so no
 * booking is created and the one-pending-reservation rule does not apply.
 */
test.describe('Tamara availability', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Reads the payment dialog on a lazily rendered page; verified on Chromium only.',
  );

  test('is selectable when the booking total is inside its limits', async ({ page }) => {
    const carDetailsPage = new CarDetailsPage(page);

    // The pinned car is ﷼200/day, so the default three-day rental clears the
    // minimum comfortably.
    await goToDeliveryOptionalCarDetails(page);

    // The page opens on Mada, which is why the logo changing is what proves a
    // choice landed rather than merely being clicked.
    await carDetailsPage.expectPayMethodLogo('mada');

    await carDetailsPage.expectPaymentMethodEnabled(tamaraPaymentLabel);
    await carDetailsPage.closePaymentDialog();

    await carDetailsPage.selectTamaraPaymentMethod();
    await carDetailsPage.expectPayMethodLogo('tamara');
  });

  test('is offered but refused when the booking total is below the minimum', async ({ page }) => {
    const homePage = new HomePage(page);
    const carListPage = new CarListPage(page);
    const carBranchesPage = new CarBranchesPage(page);
    const carDetailsPage = new CarDetailsPage(page);
    const cheap = testData.tamara.belowMinimum;

    await homePage.openArabicHomePage();
    await homePage.selectCity(cheap.city);
    await homePage.selectRentalDuration(testData.booking.duration);
    await homePage.submitSearch();

    await carListPage.expectLoaded();
    await carListPage.searchForCar(cheap.searchTerm);
    // Two listings share the name here; the price separates them.
    await carListPage.selectPinnedCar(cheap.carLabel, cheap.dailyPrice);
    await expect(page, 'the cheap car resolved to a different branches page').toHaveURL(
      new RegExp(`car-branches/${cheap.carBranchesId}`),
    );

    await carBranchesPage.expectLoaded();
    await carBranchesPage.selectBranchByPrice(cheap.dailyPrice);
    await expect(page, 'the cheap branch resolved to a different car').toHaveURL(
      new RegExp(`car-details\\?car=${cheap.carDetailsId}`),
    );

    // The branch offers every online method, so anything refused here is
    // refused on price rather than because the branch takes cash only.
    await carDetailsPage.expectPaymentMethodEnabled('مدى');
    await carDetailsPage.closePaymentDialog();

    // ﷼0.1/day over three days is far below Tamara's minimum, so its row stays
    // in the list but will not be taken.
    await carDetailsPage.expectPaymentMethodDisabled(tamaraPaymentLabel);

    // And clicking it changes nothing: the page keeps the method it opened on.
    await carDetailsPage.clickPaymentMethod(tamaraPaymentLabel);
    await carDetailsPage.closePaymentDialog();
    await carDetailsPage.expectPayMethodLogo('mada');
  });
});
