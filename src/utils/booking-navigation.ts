import { expect, type Page } from '@playwright/test';
import { testData } from '../config/test-data';
import { HomePage } from '../pages/home.page';
import { CarListPage } from '../pages/car-list.page';
import { CarBranchesPage } from '../pages/car-branches.page';

const pinned = testData.booking.pinned;

/**
 * Search the results for the pinned vehicle, take it, and take its pinned
 * branch — the same car every run, chosen out of the live listing rather than
 * navigated to, so the journey still covers search and selection.
 *
 * The ids are asserted afterwards: selection is by what a customer sees, and
 * the ids catch the case where that starts resolving to something else.
 *
 * Rent-to-own does not use this — it has its own inventory and vehicles.
 */
export async function selectPinnedCarAndBranch(page: Page): Promise<void> {
  const carListPage = new CarListPage(page);
  const carBranchesPage = new CarBranchesPage(page);

  await carListPage.expectLoaded();
  await carListPage.searchForCar(pinned.searchTerm);
  await carListPage.selectPinnedCar(pinned.carLabel, pinned.carBranchCount);

  await expect(page, 'pinned car resolved to a different branches page').toHaveURL(
    new RegExp(`car-branches/${pinned.carBranchesId}`),
  );

  await carBranchesPage.expectLoaded();
  await carBranchesPage.selectPinnedBranch(pinned.branchLabel, pinned.branchConfirmation);

  await expect(page, 'pinned branch resolved to a different car').toHaveURL(
    new RegExp(`car-details\\?car=${pinned.carDetailsId}`),
  );
}

/**
 * Navigate from the home page to the pinned car's details page, so the pay
 * action is reachable without the (fragile) map-based location picker.
 */
export async function goToDeliveryOptionalCarDetails(page: Page): Promise<void> {
  const homePage = new HomePage(page);

  await homePage.openArabicHomePage();
  // Wait for the search widget to fill in its dates before searching: they are
  // populated after hydration, and searching too early runs without a duration.
  await homePage.expectValidRentalDuration();
  await homePage.searchCarsInCity(testData.booking.city);

  await selectPinnedCarAndBranch(page);
}

/**
 * Same car, reached through "Offers and rental packages" so the booking is a
 * monthly rental package and therefore payable in instalments.
 */
export async function goToRentalPackageCarDetails(page: Page): Promise<void> {
  const homePage = new HomePage(page);

  await homePage.openArabicHomePage();
  await homePage.expectValidRentalDuration();
  await homePage.searchCarsInCity(testData.booking.city);
  // Back to the home page through the header link: a full reload would re-seed
  // the stored session and lose the city that was just picked.
  await homePage.returnToHomeViaNav();
  await homePage.openOffersAndRentalPackages();

  await selectPinnedCarAndBranch(page);
}
