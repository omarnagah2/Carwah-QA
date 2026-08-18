import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Tamara's entry in the payment dialog. It is labelled by what it offers rather
 * than by the provider's name, so the string says nothing about who it is —
 * hence the constant, shared by the specs that assert on it.
 */
export const tamaraPaymentLabel = '3 دفعات بدون فوائد';

export class CarDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get changePaymentMethodTrigger(): Locator {
    return this.page.getByText('تغيير طريقة الدفع');
  }

  private get paymentDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('heading', { name: 'اختر طريقة دفع' }) });
  }

  private paymentMethod(name: string | RegExp): Locator {
    return this.paymentDialog.getByRole('heading', { name });
  }

  private get closePaymentDialogButton(): Locator {
    return this.paymentDialog.getByRole('button', { name: 'إغلاق' });
  }

  private get payNowButton(): Locator {
    // The label uses الأن (alef-hamza), so match both spellings defensively.
    return this.page.getByRole('button', { name: /ادفع ال[أآ]ن/ });
  }

  private get pendingRentalDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /حجز قيد ال[إا]نتظار/ });
  }

  private get proceedButton(): Locator {
    // Rental-package (installment) bookings proceed to an installments dialog
    // instead of paying straight away.
    return this.page.getByRole('button', { name: /التالي|Proceed/i });
  }

  private get installmentsDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /ستكون الدفعات الشهرية/ });
  }

  /**
   * A rental-package tile in the "الباقات التأجيرية" strip, found by its period
   * label — the tiles carry no id, and their class is shared by all six.
   */
  private rentalPackageTile(label: string): Locator {
    return this.page
      .locator('div.cursor-pointer')
      .filter({ has: this.page.locator(`h6:text-is("${label}")`) });
  }

  /**
   * The package matching the period chosen on the home page comes back
   * selected, which is the link between the two pages.
   *
   * Selection shows up only as the border colour of the tile's wrapper: the
   * tiles are otherwise identical, with no class, no `aria-selected` and no
   * checked input to read.
   */
  async expectRentalPackageSelected(label: string): Promise<void> {
    const tile = this.rentalPackageTile(label).first();
    await expect(tile, `no "${label}" rental package is offered for this car`).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      tile.locator('xpath=..'),
      `"${label}" is not the selected rental package`,
    ).toHaveCSS('border-color', 'rgb(122, 179, 197)');
  }

  async proceedToInstallments(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const button = this.proceedButton.first();
    await expect(button).toBeVisible({ timeout: 20_000 });
    await button.click();
  }

  async expectInstallmentsDialog(): Promise<void> {
    await expect(this.installmentsDialog).toBeVisible({ timeout: 20_000 });
    // Splitting the amount into monthly instalments is what makes this an
    // instalment booking, and the schedule lists the resulting payments.
    await expect(
      this.installmentsDialog.locator('input[type="checkbox"]').first(),
    ).toBeChecked();
    await expect(
      this.installmentsDialog.getByText(/ستكون الدفعات الشهرية/),
    ).toBeVisible();
    await expect(
      this.installmentsDialog.getByRole('button', { name: /ادفع ال[أآ]ن/ }),
    ).toBeVisible();
  }

  async payFromInstallmentsDialog(): Promise<void> {
    await this.installmentsDialog
      .getByRole('button', { name: /ادفع ال[أآ]ن/ })
      .first()
      .click();
  }

  private get deliverySection(): Locator {
    return this.page.getByText('توصيل السيارة');
  }

  private get deliveryPickupAddress(): Locator {
    return this.page.locator('.delivery-input');
  }

  /**
   * A delivery booking carries the pickup location chosen during the search
   * through to the details page, so the section shows a real address rather
   * than the "choose a location" placeholder.
   */
  async expectDeliverySection(): Promise<void> {
    await expect(this.deliverySection.first()).toBeVisible({ timeout: 30_000 });
    await expect(this.deliveryPickupAddress.first()).toBeVisible();
    await expect(this.deliveryPickupAddress.first()).not.toHaveText(/حدد موقع الاستلام/);
  }

  async payNow(): Promise<void> {
    const button = this.payNowButton.first();
    await expect(button).toBeVisible({ timeout: 20_000 });
    await button.click();
  }

  private get rentalDetailsAction(): Locator {
    // Offered by both the payment-success dialog and the pending-rental alert.
    // Not a button or a link — plain text with a handler on it.
    return this.page.getByText('مشاهدة تفاصيل الحجز');
  }

  private get cancelReservationLink(): Locator {
    return this.page.getByText('إلغاء الحجز', { exact: true });
  }

  private get cancelReasonsDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'إلغاء الطلب' });
  }

  /**
   * Follow the payment-success dialog through to the booking it created, which
   * is this same page addressed by `bookingId`.
   *
   * Taking the rental-details action is also what dismisses the dialog, so
   * there is nothing to reload afterwards. Reloading actively hurt: the URL
   * still carries `checkout_id`, so a fresh load renders the success dialog
   * again and its backdrop then swallows the click on the cancel link
   * underneath. Waiting for the dialog to go is what confirms the page is
   * clear.
   */
  async openRentalDetailsFromSuccess(): Promise<void> {
    await expect(this.rentalDetailsAction.first()).toBeVisible({ timeout: 30_000 });
    await this.rentalDetailsAction.first().click();
    await this.page.waitForURL(/bookingId=/, { timeout: 30_000 });
    await expect(this.rentalDetailsAction.first()).toBeHidden({ timeout: 20_000 });
  }

  /**
   * Cancel the booking whose details page is open, which is where the customer
   * cancels from. The confirm button carries the same label as the link that
   * opens the dialog, so it is taken by its own class instead; it stays
   * disabled until a reason is chosen.
   */
  async cancelReservation(): Promise<void> {
    const link = this.cancelReservationLink.first();
    await expect(link, 'this booking offers no cancel action').toBeVisible({ timeout: 30_000 });
    await link.click();

    await expect(this.cancelReasonsDialog).toBeVisible({ timeout: 20_000 });
    await this.cancelReasonsDialog
      .locator('input[name="cancel-reason"]')
      .first()
      .check({ force: true });

    const confirm = this.cancelReasonsDialog.locator('button.cancelReasons');
    await expect(confirm).toBeEnabled({ timeout: 10_000 });
    await confirm.click();

    // Cancelling lands back on the rentals list.
    await this.page.waitForURL(/my-rentals/, { timeout: 30_000 });
  }

  async expectPendingRentalAlert(): Promise<void> {
    await expect(this.pendingRentalDialog).toBeVisible();
    await expect(
      this.pendingRentalDialog.getByText(/لا يمكنك الطلب حتى يتم تأكيد أو إلغاء طلبك/),
    ).toBeVisible();
    await expect(
      this.pendingRentalDialog.getByText('مشاهدة تفاصيل الحجز'),
    ).toBeVisible();
  }

  async expectPaymentSectionVisible(): Promise<void> {
    // No manual scrolling: the payment section re-renders while prices load, so
    // scrollIntoViewIfNeeded can act on a detached element. toBeVisible() waits
    // for a stable match and click() scrolls on its own.
    await expect(this.changePaymentMethodTrigger).toBeVisible({ timeout: 20_000 });
  }

  async openPaymentMethods(): Promise<void> {
    await this.expectPaymentSectionVisible();
    await this.changePaymentMethodTrigger.click();
    await expect(this.paymentDialog).toBeVisible();
  }

  /**
   * The provider logo the pay button carries. This is how the page reports
   * which method is set, and the only place it is stated outside the dialog.
   */
  private get payMethodLogo(): Locator {
    return this.page.locator('#rent-action img[alt="payment icon"]');
  }

  /**
   * A method's row in the dialog. The label is an `h6` inside a wrapper div,
   * and the row around both is what carries the radio icon and the cursor.
   */
  private paymentMethodRow(name: string | RegExp): Locator {
    return this.paymentMethod(name).locator('xpath=../..');
  }

  /** Which provider the pay button is currently set to. */
  async expectPayMethodLogo(logo: string): Promise<void> {
    await expect(
      this.payMethodLogo,
      `the pay button should carry the ${logo} logo`,
    ).toHaveAttribute('src', new RegExp(`${logo}\\.svg$`));
  }

  /**
   * Open the dialog, take a method, close it, and confirm it was actually
   * taken.
   *
   * The confirmation matters: the dialog gives no feedback a caller can rely on
   * once it is closed, and Mada is the method the page opens on — so a click
   * that silently failed would leave Mada selected and every card test would
   * still pass, paying with whatever number it typed. The pay button's logo is
   * the page's own statement of the choice, so that is what is asserted.
   */
  private async selectPaymentMethod(name: string | RegExp, logo: string): Promise<void> {
    await this.openPaymentMethods();

    // The list fills in asynchronously — a sixth method appears a beat after the
    // dialog opens — so a click made too early lands on a row that is about to
    // be replaced and the choice is silently lost. Waiting for the row to be
    // selectable settles that, and refuses a method the price has disabled.
    await expect(
      this.paymentMethodRow(name),
      'this method is not selectable, so it cannot be chosen',
    ).toHaveCSS('cursor', 'pointer');

    await this.paymentMethod(name).click();
    await this.expectPaymentMethodChosen(name);

    await this.closePaymentDialogButton.click();
    await expect(this.paymentDialog).toBeHidden();
    await this.expectPayMethodLogo(logo);
  }

  async selectTabbyPaymentMethod(): Promise<void> {
    await this.selectPaymentMethod(/تابي/, 'tabby-badge');
  }

  async selectMadaPaymentMethod(): Promise<void> {
    await this.selectPaymentMethod('مدى', 'mada');
  }

  /** Tamara is labelled by what it offers, not by name — "3 instalments, no interest". */
  async selectTamaraPaymentMethod(): Promise<void> {
    await this.selectPaymentMethod(tamaraPaymentLabel, 'tamara');
  }

  async selectCreditCardPaymentMethod(): Promise<void> {
    await this.selectPaymentMethod('بطاقة ائتمان', 'visamaster');
  }

  /**
   * Tamara is offered only while the booking total sits inside the limits held
   * in Firebase Remote Config. Outside them the row stays in the list and
   * simply refuses the click.
   *
   * `cursor: not-allowed` is the *only* thing that marks it: opacity, colour,
   * pointer-events and the radio icon are identical to a selectable row, so
   * there is nothing else to assert on.
   */
  async expectPaymentMethodDisabled(name: string | RegExp): Promise<void> {
    await this.openPaymentMethods();
    await expect(
      this.paymentMethodRow(name),
      'this method should be offered but not selectable',
    ).toHaveCSS('cursor', 'not-allowed');
  }

  async expectPaymentMethodEnabled(name: string | RegExp): Promise<void> {
    await this.openPaymentMethods();
    await expect(this.paymentMethodRow(name)).toHaveCSS('cursor', 'pointer');
  }

  /** Click a method without assuming it will be taken. */
  async clickPaymentMethod(name: string | RegExp): Promise<void> {
    await this.paymentMethod(name).click();
  }

  /** Which method the dialog currently shows as chosen. */
  async expectPaymentMethodChosen(name: string | RegExp): Promise<void> {
    await expect(
      this.paymentMethodRow(name).locator('img[src*="filledCircle"]'),
      'this method should be the one marked as chosen',
    ).toBeVisible();
  }

  async closePaymentDialog(): Promise<void> {
    await this.closePaymentDialogButton.click();
    await expect(this.paymentDialog).toBeHidden();
  }

  async expectCorePaymentMethods(): Promise<void> {
    // These online methods are offered on every branch. Apple Pay and Cash are
    // branch-conditional, so they are not asserted here. The English names are
    // carried through to the failure message: the Arabic labels do not say
    // which provider they are, least of all Tamara's.
    const coreMethods: [string | RegExp, string][] = [
      ['مدى', 'Mada'],
      ['بطاقة ائتمان', 'Visa / Mastercard'],
      [/تابي/, 'Tabby'],
      ['3 دفعات بدون فوائد', 'Tamara'],
    ];

    for (const [label, provider] of coreMethods) {
      await expect(this.paymentMethod(label), `${provider} should be offered`).toBeVisible();
    }
  }
}
