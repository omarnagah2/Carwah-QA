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
     * The monthly (instalment) booking's rental period, set on the home page's
     * period slider. The car-details packages are fixed tiers — one week, one
     * month, 3, 6, 9 and 12 months — so this has to be one of them for a
     * package to come back selected. The slider opens on 12, so 3 is chosen
     * deliberately: it only matches if the slider really moved.
     */
    months: Number(process.env.CARWAH_BOOKING_MONTHS ?? 3),
    /** How that period is labelled on the car-details package tile. */
    get monthsLabel(): string {
      return this.months === 1 ? 'شهر واحد' : `${this.months} أشهر`;
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
      // The same ally, priced per month when the search was a monthly one.
      branchMonthlyPrice: process.env.CARWAH_PINNED_BRANCH_MONTHLY_PRICE ?? '5970',
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
    // Tabby's sandbox OTP. Its input is controlled and submits by itself on the
    // fourth digit, so it is typed a key at a time rather than filled.
    tabbyOtp: process.env.CARWAH_TABBY_OTP ?? '8888',
  },
  /**
   * Tamara is offered only while the booking total sits inside limits held in
   * **Firebase Remote Config** (`tamara_min_limit_value` /
   * `tamara_max_limit_value`, on the *Prod* project). Outside them the payment
   * dialog dims the option instead of hiding it.
   *
   * The figures are mirrored here rather than read from Firebase, so they can
   * drift: if a Tamara test starts failing, check Remote Config before hunting
   * for a broken selector.
   */
  tamara: {
    minTotal: Number(process.env.CARWAH_TAMARA_MIN ?? 99),
    maxTotal: Number(process.env.CARWAH_TAMARA_MAX ?? 50_000),
    /**
     * Tamara's sandbox checkout (`checkout-sandbox.tamara.co`), which opens in a
     * **new browser tab** rather than navigating in place the way Tabby does.
     *
     * There is no OTP to know in advance: the sandbox prints the code on the
     * page. Identity verification is likewise self-serve — a "Non-Citizen"
     * button fills the ID and date of birth, and the page says outright that it
     * exists only outside production.
     */
    sandboxPhoneNumber: process.env.CARWAH_TAMARA_PHONE ?? '517965874',
    /**
     * A booking too cheap for Tamara, which is how the disabled state is
     * covered by a real listing rather than a contrived one: ﷼0.1/day, so even
     * the default three-day rental totals far below the minimum.
     *
     * The branch matters as much as the car. A cash-only branch offers no
     * online methods at all, which looks like the same failure but proves
     * nothing about Tamara's limits — this one offers all five, with Tamara the
     * only one refused.
     */
    belowMinimum: {
      city: process.env.CARWAH_TAMARA_CHEAP_CITY ?? 'المدينة المنورة',
      searchTerm: process.env.CARWAH_TAMARA_CHEAP_SEARCH ?? 'سيمبول',
      // Two listings match the term; the price is what separates this one.
      carLabel: process.env.CARWAH_TAMARA_CHEAP_CAR ?? 'سيمبول',
      dailyPrice: process.env.CARWAH_TAMARA_CHEAP_PRICE ?? '0.1',
      carBranchesId: process.env.CARWAH_TAMARA_CHEAP_BRANCHES_ID ?? '15898',
      carDetailsId: process.env.CARWAH_TAMARA_CHEAP_DETAILS_ID ?? '15898',
    },
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
