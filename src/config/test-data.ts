export const testData = {
  login: {
    phoneNumber: process.env.CARWAH_PHONE_NUMBER ?? '534271861',
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
  rentToOwn: {
    // A rent-to-own car whose branch does not demand a delivery location, so
    // payment is reachable without the (fragile) map picker. The Range Rover in
    // this listing does demand one.
    car: process.env.CARWAH_RENT_TO_OWN_CAR ?? 'شييري تيجو',
  },
  // Vehicle categories from the home page's "search by vehicle type" strip.
  vehicleTypes: {
    // Sedan — currently has cars available.
    withResults: process.env.CARWAH_VEHICLE_TYPE_WITH_RESULTS ?? 'سيدان',
    // Commercial — currently has none, so it shows the empty-results message.
    withoutResults: process.env.CARWAH_VEHICLE_TYPE_WITHOUT_RESULTS ?? 'تجارية',
  },
  // HyperPay (eu-test.oppwa.com) sandbox test cards. Any valid future expiry.
  // NOTE: the Mada test card currently fails finalization with a backend 500,
  // so the successful-payment test uses the Visa card.
  payment: {
    holder: process.env.CARWAH_TEST_CARD_HOLDER ?? 'Omar Nagah',
    expiry: process.env.CARWAH_TEST_CARD_EXPIRY ?? '1228', // MM/YY -> 12/28
    cvv: process.env.CARWAH_TEST_CARD_CVV ?? '123',
    visaNumber: process.env.CARWAH_TEST_VISA ?? '4111111111111111',
    madaNumber: process.env.CARWAH_TEST_MADA ?? '4464040000000007',
  },
  // Partner tags applied with ?tag=. Each shows that partner's banner above the
  // header. Slugs are exactly as the partners' links use them, spaces included.
  partnerTags: [
    { tag: 'STC', message: /stc pay/i },
    { tag: 'Saudi Airlines', message: /أميال الفرسان/ },
    { tag: 'tamara', message: /تمارا/ },
    { tag: 'tabby', message: /تابي/ },
    { tag: 'qoad', message: /كود/ },
    { tag: 'enterprise', message: /Enterprise/i },
    { tag: 'Flynas', message: /أميالك/ },
  ],
  unknownPartnerTag: 'notarealpartner',
};
