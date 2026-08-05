import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/** How far ahead the rental starts, and how many days it runs. */
export interface RentalDuration {
  startOffsetDays: number;
  days: number;
}

export class HomePage extends BasePage {
  private readonly invalidCouponMessagePattern =
    /\u0643\u0648\u0628\u0648\u0646 \u0627?\u0644\u062e\u0635\u0645 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d|invalid coupon|coupon is invalid/i;

  constructor(page: Page) {
    super(page);
  }

  private get couponWrap(): Locator {
    return this.page.locator('.coupon-wrap');
  }

  private get couponInput(): Locator {
    return this.couponWrap.locator('input[name="code"]');
  }

  private get applyCouponButton(): Locator {
    return this.couponWrap.getByRole('button', { name: /\u062A\u0637\u0628\u064A\u0642|Apply/i });
  }

  private get invalidCouponValidationMessage(): Locator {
    return this.couponWrap.getByText(this.invalidCouponMessagePattern);
  }

  private get appliedCouponMessage(): Locator {
    // The applied-coupon success label is the span wrapping the bold code.
    return this.couponWrap.locator('span:has(span.bold)');
  }

  private get appliedCouponCode(): Locator {
    return this.couponWrap.locator('span.bold');
  }

  private get removeCouponButton(): Locator {
    return this.couponWrap.getByRole('button', { name: /\u062d\u0630\u0641|Remove/i });
  }

  private get accountMenuTrigger(): Locator {
    return this.page.locator('img[alt="avatar"]');
  }

  private get accountMenu(): Locator {
    return this.page.locator('#tool-tip');
  }

  private get logoutMenuItem(): Locator {
    return this.accountMenu.getByText(/تسجيل الخروج|خروج|Logout/i);
  }

  private get headerLoginButton(): Locator {
    return this.page.locator('button.login-button');
  }

  private get pickupCityInput(): Locator {
    return this.page.locator('input[placeholder="موقع استلام السيارة"]');
  }

  /**
   * An option in the dropdown that opens under the pickup-location field. The
   * list holds cities, airports and train stations, all as `span.color-4`, so
   * the name is matched exactly.
   *
   * This deliberately does not go through the "أبرز المدن" (Top Cities)
   * heading: that heading belongs to the **footer**, and its city entries are
   * links that jump straight to a search — skipping the widget, the duration
   * and the search button along with it.
   */
  private cityOption(city: string): Locator {
    return this.page.locator(`span.color-4:text-is("${city}")`);
  }

  private get deliveryTab(): Locator {
    return this.page.locator('.tab-item span', { hasText: 'توصيل' });
  }

  private get editPickupLocationLink(): Locator {
    return this.page.getByText('تعديل');
  }

  private get searchButton(): Locator {
    return this.page.getByText('ابحث', { exact: true });
  }

  private get locationDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'حدد موقع الاستلام' });
  }

  private get outOfServiceAreaMessage(): Locator {
    return this.page.getByText(/خارج نطاق الخدمة/);
  }

  /**
   * Delivery bookings need a pickup location before searching. The picker
   * reverse-geocodes wherever the pin lands, and not every point is inside the
   * delivery service area — the app rejects those with "your location is
   * outside the service area". So try points around the map until one is
   * accepted, which is what choosing a *valid* location amounts to here.
   */
  async setDeliveryPickupLocation(): Promise<void> {
    // Offsets from the map centre, as a fraction of its size.
    const candidatePoints = [
      [0, 0],
      [0.12, 0.08],
      [-0.12, -0.08],
      [0.2, -0.12],
      [-0.2, 0.12],
    ];

    for (const [dx, dy] of candidatePoints) {
      if (!(await this.locationDialog.isVisible().catch(() => false))) {
        await this.editPickupLocationLink.first().click();
        await expect(this.locationDialog).toBeVisible({ timeout: 20_000 });
      }

      const map = this.locationDialog.locator('.gm-style').first();
      await expect(map).toBeVisible();
      // Let the map settle, or the pin lands on a stale position.
      await this.page.waitForTimeout(2_500);

      const box = await map.boundingBox();
      if (!box) {
        throw new Error('Delivery location map is not visible.');
      }
      await this.page.mouse.click(
        box.x + box.width * (0.5 + dx),
        box.y + box.height * (0.5 + dy),
      );

      const confirm = this.locationDialog.getByRole('button', { name: 'تأكيد' });
      await expect(confirm).toBeEnabled({ timeout: 20_000 });
      await confirm.click();
      await this.page.waitForTimeout(2_000);

      if (!(await this.outOfServiceAreaMessage.isVisible().catch(() => false))) {
        return;
      }

      // Outside the delivery area: dismiss and try a different point.
      await this.page
        .getByRole('button', { name: /بحث في موقع مختلف/ })
        .click()
        .catch(() => undefined);
      await this.page.waitForTimeout(1_500);
    }

    throw new Error('Could not pick a delivery location inside the service area.');
  }

  /**
   * Switch to the delivery tab, choose the city, pick a pickup location, and
   * search.
   *
   * The city comes first on purpose: it is what re-centres the location
   * picker's map. Without it the map opens on the app's default area (Riyadh)
   * and every pin the picker can drop is a Riyadh address, whatever the
   * browser's geolocation says — so the search returns another city's cars.
   */
  async searchWithDelivery(city: string): Promise<void> {
    await expect(this.deliveryTab.first()).toBeVisible({ timeout: 30_000 });
    await this.deliveryTab.first().click();
    await this.page.waitForTimeout(1_500);

    await this.selectCity(city);

    await this.setDeliveryPickupLocation();

    // The closed dialog stays mounted for a while and swallows the click, so
    // retry until the search actually navigates.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await this.page.waitForTimeout(1_500);
      await this.searchButton.first().click({ timeout: 10_000 }).catch(() => undefined);
      const navigated = await this.page
        .waitForURL(/car-search/, { timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (navigated) {
        return;
      }
    }

    throw new Error('Delivery search did not open the car list.');
  }

  private get homeNavLink(): Locator {
    return this.page.getByRole('link', { name: 'الرئيسية' });
  }

  private get offersAndRentalPackagesCard(): Locator {
    // "العروض و الباقات الشهرية" (Offers and monthly rental packages) in the
    // "Selected for you" strip; the label is split across two elements.
    return this.page.getByText('و الباقات الشهرية');
  }

  private vehicleTypeCard(type: string): Locator {
    // Cards in the "ابحث حسب السيارة" (search by vehicle type) strip are labelled
    // with the category name only, so an exact text match picks them out. The
    // strip is a carousel that also keeps off-screen slides in the DOM, so match
    // the visible one rather than a hidden copy.
    return this.page.getByText(type, { exact: true }).filter({ visible: true });
  }

  /** Search from the home page by vehicle category (Sedan, Economy, SUV, ...). */
  async searchByVehicleType(type: string): Promise<void> {
    const card = this.vehicleTypeCard(type).first();

    // The strip renders lazily as the page is scrolled, so walk down the page
    // until the card exists.
    for (let attempt = 0; attempt < 10 && (await card.count()) === 0; attempt += 1) {
      await this.page.mouse.wheel(0, 1_000);
      await this.page.waitForTimeout(500);
    }

    // The home page occasionally comes back without its content sections, which
    // a single reload fixes.
    if ((await card.count()) === 0) {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      for (let attempt = 0; attempt < 10 && (await card.count()) === 0; attempt += 1) {
        await this.page.mouse.wheel(0, 1_000);
        await this.page.waitForTimeout(500);
      }
    }

    // The cards sit in a horizontal carousel, so one can be attached but out of
    // view: bring it into view before asserting it is visible.
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    await this.page.waitForURL(/car-search/, { timeout: 30_000 });
  }

  private get pickupDateInput(): Locator {
    return this.page.locator('div.input:has(span.floating-label:text-is("وقت استلام السيارة")) input');
  }

  private get dropoffDateInput(): Locator {
    return this.page.locator('div.input:has(span.floating-label:text-is("وقت تسليم السيارة")) input');
  }

  /**
   * The date picker is react-multi-date-picker. Its own `rmdp-*` classes are
   * what we anchor on: the wrapper around it is a CSS-module class whose hash
   * changes with every bundle build.
   */
  private get calendar(): Locator {
    return this.page.locator('.rmdp-calendar');
  }

  private get nextMonthArrow(): Locator {
    return this.page.locator('.rmdp-arrow-container.rmdp-right');
  }

  /**
   * A selectable day in the visible month. Past days are `rmdp-disabled` and
   * the adjacent months' filler cells are `rmdp-day-hidden`; excluding both
   * keeps the match to days that can actually be booked.
   */
  private dayCell(day: number): Locator {
    return this.page.locator(
      `.rmdp-day-picker .rmdp-day:not(.rmdp-disabled):not(.rmdp-day-hidden):has(span:text-is("${day}"))`,
    );
  }

  /** `#apply` rather than the label: the coupon box has a "تطبيق" button too. */
  private get applyDatesButton(): Locator {
    return this.page.locator('button#apply');
  }

  async openHomePage(): Promise<void> {
    // Wait for the DOM rather than the full load event: the live site pulls in
    // heavy third-party scripts (analytics, payment widgets) that can delay the
    // load event past the navigation timeout on slower browsers. Web-first
    // assertions below already wait for the elements we actually need.
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async openArabicHomePage(): Promise<void> {
    await this.page.goto('/ar', { waitUntil: 'domcontentloaded' });
  }

  /**
   * Returns to the home page through the header link rather than a fresh
   * navigation. The authenticated fixture re-seeds sessionStorage on every full
   * page load, which would reset the search back to the stored city, so the
   * client-side route is what keeps a just-selected city.
   */
  async returnToHomeViaNav(): Promise<void> {
    await this.homeNavLink.first().click();
    await expect(this.offersAndRentalPackagesCard.first()).toBeVisible({ timeout: 30_000 });
  }

  async openOffersAndRentalPackages(): Promise<void> {
    await this.offersAndRentalPackagesCard.first().click();
    await this.page.waitForURL(/car-search/, { timeout: 30_000 });
  }

  /** Take a city from the pickup-location dropdown. Does not search. */
  async selectCity(city: string): Promise<void> {
    await expect(this.pickupCityInput).toBeVisible({ timeout: 30_000 });
    await this.pickupCityInput.click();

    const option = this.cityOption(city).first();
    await expect(option, `"${city}" is not offered in the pickup-location list`).toBeVisible({
      timeout: 20_000,
    });
    await option.click();

    await expect(this.pickupCityInput).toHaveValue(city, { timeout: 10_000 });
  }

  /**
   * Choose the rental window in the calendar.
   *
   * The two date fields are `readonly`, so the picker is the only way to set
   * them: take the pickup day, take the return day, and apply. The calendar
   * opens on the current month, and both days are clicked as a range, which is
   * what the widget expects — a second click sets the end rather than moving
   * the start.
   */
  async selectRentalDuration({ startOffsetDays, days }: RentalDuration): Promise<void> {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + startOffsetDays);
    const end = new Date(start);
    end.setDate(start.getDate() + days);

    await this.pickupDateInput.click();
    await expect(this.calendar).toBeVisible({ timeout: 20_000 });

    // The calendar opens on today's month and only ever moves forward here,
    // so track how far it has been advanced rather than re-reading its header.
    let shownMonthOffset = 0;
    const monthsFromToday = (date: Date): number =>
      (date.getFullYear() - today.getFullYear()) * 12 + (date.getMonth() - today.getMonth());

    for (const target of [start, end]) {
      for (const wanted = monthsFromToday(target); shownMonthOffset < wanted; shownMonthOffset += 1) {
        await this.nextMonthArrow.first().click();
        await this.page.waitForTimeout(400);
      }
      await this.dayCell(target.getDate()).first().click();
      await this.page.waitForTimeout(400);
    }

    await this.applyDatesButton.click();
    await expect(this.calendar).toBeHidden({ timeout: 10_000 });

    // Both fields render as "<day> <month> <year> <time>", so the day is what
    // confirms the range landed where it was aimed.
    await expect(this.pickupDateInput).toHaveValue(new RegExp(`^${start.getDate()}\\s`));
    await expect(this.dropoffDateInput).toHaveValue(new RegExp(`^${end.getDate()}\\s`));
  }

  /** Run the search and wait for the results page. */
  async submitSearch(): Promise<void> {
    await expect(this.searchButton.first()).toBeVisible({ timeout: 20_000 });
    await this.searchButton.first().click();
    await this.page.waitForURL(/car-search/, { timeout: 30_000 });
  }

  async logout(): Promise<void> {
    await this.ensureAccountMenuTriggerVisible();

    await this.accountMenuTrigger.hover();
    await this.accountMenuTrigger.click();

    await expect(this.logoutMenuItem).toBeVisible();
    await this.logoutMenuItem.click();
  }

  private async ensureAccountMenuTriggerVisible(): Promise<void> {
    // The header can briefly render its logged-out variant while the persisted
    // session rehydrates, leaving the account trigger absent. The session is
    // already seeded from the first load, so a single reload hydrates cleanly.
    try {
      await expect(this.accountMenuTrigger).toBeVisible({ timeout: 10_000 });
    } catch {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await expect(this.accountMenuTrigger).toBeVisible({ timeout: 15_000 });
    }
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.headerLoginButton).toBeVisible();
    await expect(this.accountMenuTrigger).toBeHidden();
  }

  async applyCoupon(couponCode: string): Promise<void> {
    await this.couponInput.scrollIntoViewIfNeeded();
    await expect(this.couponInput).toBeVisible();

    await this.couponInput.fill(couponCode);
    await expect(this.couponInput).toHaveValue(couponCode);

    // Applying replaces the apply button with the remove button in both the
    // valid and invalid outcomes, so wait for it to disappear to confirm the
    // action registered. Against the live backend the first click can be
    // swallowed before the handler is ready, so re-click once if it lingers.
    await this.applyCouponButton.click();

    try {
      await expect(this.applyCouponButton).toBeHidden({ timeout: 5_000 });
    } catch {
      await this.applyCouponButton.click();
      await expect(this.applyCouponButton).toBeHidden({ timeout: 10_000 });
    }
  }

  async expectInvalidCouponFieldState(): Promise<void> {
    await expect(this.invalidCouponValidationMessage).toBeVisible();
    await expect(this.invalidCouponValidationMessage).toHaveCSS('color', 'rgb(246, 86, 86)');

    await expect(this.applyCouponButton).toBeHidden();
    await expect(this.removeCouponButton).toBeVisible();
    await expect(this.removeCouponButton).toHaveCSS('color', 'rgb(246, 86, 86)');
  }

  async expectValidCouponFieldState(couponCode: string): Promise<void> {
    await expect(this.appliedCouponMessage).toBeVisible();
    await expect(this.appliedCouponMessage).toHaveCSS('color', 'rgb(126, 219, 38)');
    await expect(this.appliedCouponCode).toHaveText(couponCode, { ignoreCase: true });

    await expect(this.invalidCouponValidationMessage).toBeHidden();

    await expect(this.applyCouponButton).toBeHidden();
    await expect(this.removeCouponButton).toBeVisible();
  }

  async removeCoupon(): Promise<void> {
    await expect(this.removeCouponButton).toBeVisible();
    await this.removeCouponButton.click();
  }

  async expectCouponFieldCleared(): Promise<void> {
    await expect(this.couponInput).toHaveValue('');

    await expect(this.applyCouponButton).toBeVisible();
    await expect(this.removeCouponButton).toBeHidden();
    await expect(this.invalidCouponValidationMessage).toBeHidden();
  }
}
