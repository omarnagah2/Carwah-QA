export const testData = {
  login: {
    phoneNumber: process.env.CARWAH_PHONE_NUMBER ?? '598598597',
    // Second customer, used by the instalment booking test so it owns its own
    // pending-reservation slot and cannot collide with the normal booking.
    installmentPhoneNumber:
      process.env.CARWAH_INSTALLMENT_PHONE_NUMBER ?? '591594597',
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
  // HyperPay (eu-test.oppwa.com) sandbox test cards. Any valid future expiry.
  // NOTE: the Mada test card currently fails finalization with a backend 500,
  // so the successful-payment test uses the Visa card.
  payment: {
    holder: 'Test User',
    expiry: process.env.CARWAH_TEST_CARD_EXPIRY ?? '1228', // MM/YY -> 12/28
    cvv: process.env.CARWAH_TEST_CARD_CVV ?? '123',
    visaNumber: process.env.CARWAH_TEST_VISA ?? '4111111111111111',
    madaNumber: process.env.CARWAH_TEST_MADA ?? '4464040000000007',
  },
};
