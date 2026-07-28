import { expect, type Page } from '@playwright/test';
import { testData } from '../config/test-data';
import { HomePage } from '../pages/home.page';
import { CarListPage } from '../pages/car-list.page';
import { CarBranchesPage } from '../pages/car-branches.page';

/**
 * Navigate from the home page to the delivery-optional car's details page, so
 * the pay action is reachable without the (fragile) map-based location picker.
 */
export async function goToDeliveryOptionalCarDetails(page: Page): Promise<void> {
  const homePage = new HomePage(page);
  const carListPage = new CarListPage(page);
  const carBranchesPage = new CarBranchesPage(page);

  await homePage.openArabicHomePage();
  await homePage.searchCarsInCity(testData.booking.city);
  await carListPage.expectLoaded();
  await carListPage.selectCarByName(testData.booking.car);
  await carBranchesPage.expectLoaded();
  await carBranchesPage.selectFirstBranch();
  await expect(page).toHaveURL(/car-details/);
}

/**
 * Same car, reached through "Offers and rental packages" so the booking is a
 * monthly rental package and therefore payable in instalments.
 */
export async function goToRentalPackageCarDetails(page: Page): Promise<void> {
  const homePage = new HomePage(page);
  const carListPage = new CarListPage(page);
  const carBranchesPage = new CarBranchesPage(page);

  await homePage.openArabicHomePage();
  await homePage.searchCarsInCity(testData.booking.city);
  // Back to the home page through the header link: a full reload would re-seed
  // the stored session and lose the city that was just picked.
  await homePage.returnToHomeViaNav();
  await homePage.openOffersAndRentalPackages();

  await carListPage.expectLoaded();
  await carListPage.selectCarByName(testData.booking.car);
  await carBranchesPage.expectLoaded();
  await carBranchesPage.selectFirstBranch();
  await expect(page).toHaveURL(/car-details/);
}
