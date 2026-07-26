import { testData } from '../src/config/test-data';
import { test } from '../src/fixtures/authenticated-test';
import { HomePage } from '../src/pages/home.page';

test.describe('Coupon', () => {
  test('should show a validation error for an invalid coupon', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.openArabicHomePage();

    await homePage.applyCoupon(testData.coupons.invalidHomePageCouponCode);

    await homePage.expectInvalidCouponFieldState();
  });

  test('should apply a valid coupon from the home page coupon field', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.openArabicHomePage();

    await homePage.applyCoupon(testData.coupons.validHomePageCouponCode);

    await homePage.expectValidCouponFieldState(testData.coupons.validHomePageCouponCode);
  });

  test('should clear the coupon field after removing an applied coupon', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.openArabicHomePage();

    await homePage.applyCoupon(testData.coupons.validHomePageCouponCode);
    await homePage.expectValidCouponFieldState(testData.coupons.validHomePageCouponCode);

    await homePage.removeCoupon();

    await homePage.expectCouponFieldCleared();
  });
});
