export const testData = {
  login: {
    phoneNumber: process.env.CARWAH_PHONE_NUMBER ?? '598598597',
  },
  coupons: {
    invalidHomePageCouponCode: process.env.CARWAH_HOME_PAGE_INVALID_COUPON_CODE ?? 'hahaha',
    validHomePageCouponCode: process.env.CARWAH_HOME_PAGE_VALID_COUPON_CODE ?? 'ddd',
  },
  booking: {
    // Top-city name as shown in the Arabic home-page city picker (جدة = Jeddah).
    city: process.env.CARWAH_BOOKING_CITY ?? 'جدة',
    // A car whose branch does not require a delivery location, so the pay action
    // can be reached without the (fragile) map picker.
    car: process.env.CARWAH_BOOKING_CAR ?? 'رينو سيمبول',
  },
};
