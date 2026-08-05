export const testData = {
  login: {
    /**
     * The one customer the whole suite runs as. Signing in happens once per run
     * in the `setup` project; every spec reuses that session.
     */
    phoneNumber: process.env.CARWAH_PHONE_NUMBER ?? '534271861',
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
    /**
     * The rental window every booking spec picks in the calendar. The defaults
     * reproduce the range the widget pre-fills — today, for three days — so the
     * duration is now chosen deliberately without changing which cars and
     * prices the search returns.
     */
    duration: {
      startOffsetDays: Number(process.env.CARWAH_BOOKING_START_OFFSET_DAYS ?? 0),
      days: Number(process.env.CARWAH_BOOKING_DURATION_DAYS ?? 3),
    },
    /**
     * The one vehicle every booking type except rent-to-own books, picked out of
     * the real results rather than navigated to, so the journey still covers
     * search and selection. Rent-to-own has its own inventory and is untouched.
     */
    pinned: {
      // Typed into the car-list search box. It needs Enter to apply. The box
      // matches Arabic and Latin alike by design, so 'symbol' returns the same
      // results as 'سيمبول' — the term is not a language dependency.
      searchTerm: process.env.CARWAH_CAR_SEARCH_TERM ?? 'سيمبول',
      // Three cars match "رينو سيمبول"; the branch count is what separates the
      // ﷼110 three-branch listing from the 2022 and the ﷼61 one-branch ones.
      carLabel: process.env.CARWAH_PINNED_CAR ?? 'رينو سيمبول 2024',
      // City search: three listings share the name, and only this one is at
      // three branches.
      carBranchCount: process.env.CARWAH_PINNED_CAR_BRANCHES ?? '3 فرع',
      // Delivery search: the same car shows at one branch there, as do the
      // others, so its daily price is what tells them apart.
      deliveryPrice: process.env.CARWAH_PINNED_DELIVERY_PRICE ?? '200',
      // Its branches page lists three allies, all at the same location, so the
      // daily price is what tells them apart: this one at 200, the other two at
      // 110. Location and confirmation type are deliberately not used — every
      // ally shares the location, and the confirmation type is a branch feature
      // that can be switched on and off.
      branchDailyPrice: process.env.CARWAH_PINNED_BRANCH_DAILY_PRICE ?? '200',
      // What that selection resolves to, asserted so a silent inventory change
      // fails loudly instead of quietly booking a different car.
      carBranchesId: process.env.CARWAH_CAR_BRANCHES_ID ?? '16634',
      carDetailsId: process.env.CARWAH_CAR_DETAILS_ID ?? '17089',
    },
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
