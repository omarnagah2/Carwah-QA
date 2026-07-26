import { testData } from '../src/config/test-data';
import { test } from '../src/fixtures/authenticated-test';
import { HomePage } from '../src/pages/home.page';

test.describe('Coupon', () => {
  test('should apply coupon from the home page coupon field', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.openArabicHomePage();

    await homePage.applyCoupon(testData.coupons.homePageCouponCode);

    await homePage.expectInvalidCouponFieldState();
  });

  test('should clear the coupon field after removing an applied coupon', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.openArabicHomePage();

    await homePage.applyCoupon(testData.coupons.homePageCouponCode);
    await homePage.expectInvalidCouponFieldState();

    await homePage.removeCoupon();

    await homePage.expectCouponFieldCleared();
  });
});
