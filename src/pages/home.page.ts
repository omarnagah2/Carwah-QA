import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

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
