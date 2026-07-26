export const testData = {
  login: {
    phoneNumber: process.env.CARWAH_PHONE_NUMBER ?? '598598597',
  },
  coupons: {
    invalidHomePageCouponCode: process.env.CARWAH_HOME_PAGE_INVALID_COUPON_CODE ?? 'hahaha',
    validHomePageCouponCode: process.env.CARWAH_HOME_PAGE_VALID_COUPON_CODE ?? 'ddd',
  },
};
