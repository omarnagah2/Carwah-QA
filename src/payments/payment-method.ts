import type { Page } from '@playwright/test';
import { testData } from '../config/test-data';
import { CarDetailsPage } from '../pages/car-details.page';
import { CheckoutPage } from '../pages/checkout.page';
import { TabbyCheckoutPage } from '../pages/tabby-checkout.page';

/**
 * One way of paying for a booking, as the three steps a customer takes: pick
 * the method on the car-details page, work through whatever the provider puts
 * in front of them, and see the booking come back paid.
 *
 * The specs used to be split on two axes at once — one per booking type and one
 * per payment method — so a change to how paying works had to be made in both
 * places. With paying behind this interface, the booking-type specs stay on the
 * default card and one spec walks every method through the same journey.
 */
export interface PaymentMethod {
  /** Reads as the provider a customer picks; used in the test title. */
  readonly name: string;

  /**
   * Whether success leads on to the booking's own page, where a customer
   * cancels. True for the cards, whose success dialog offers the rental
   * details. False for Tabby — see below.
   */
  readonly releasableFromSuccess: boolean;

  /** Take this method in the car-details payment dialog. */
  select(page: Page): Promise<void>;

  /** Work through the provider's own checkout, up to the hand-back. */
  complete(page: Page): Promise<void>;

  /** Confirm the booking was paid for. */
  expectSuccess(page: Page): Promise<void>;
}

/**
 * The card methods differ only in which card is typed into the HyperPay widget
 * and which entry is taken in the payment dialog; everything after that — the
 * widget, 3-D Secure, and retrying a failed gateway callback — is shared.
 */
function cardPaymentMethod(options: {
  name: string;
  number: string;
  select: (details: CarDetailsPage) => Promise<void>;
}): PaymentMethod {
  return {
    name: options.name,
    releasableFromSuccess: true,

    async select(page: Page): Promise<void> {
      await options.select(new CarDetailsPage(page));
    },

    async complete(page: Page): Promise<void> {
      // Retries the payment the way the app tells the customer to when the
      // gateway callback fails, so the intermittent backend 500 does not mask
      // whether a booking can be made.
      await new CheckoutPage(page).payAndConfirm({
        holder: testData.payment.holder,
        number: options.number,
        expiry: testData.payment.expiry,
        cvv: testData.payment.cvv,
      });
    },

    async expectSuccess(page: Page): Promise<void> {
      await new CheckoutPage(page).expectPaymentSuccess();
    },
  };
}

export const visaPayment = cardPaymentMethod({
  name: 'Visa',
  number: testData.payment.visaNumber,
  select: (details) => details.selectCreditCardPaymentMethod(),
});

export const madaPayment = cardPaymentMethod({
  name: 'Mada',
  number: testData.payment.madaNumber,
  select: (details) => details.selectMadaPaymentMethod(),
});

export const tabbyPayment: PaymentMethod = {
  name: 'Tabby',

  /**
   * Tabby hands back to https while the GraphQL API stays on http, so Chromium
   * blocks every call on the returned page as mixed content and the success
   * dialog never gets its data: no confirmation, no rental-details action, no
   * cancel link. The booking is real — its id is in the URL — but the page
   * cannot show it, which is a product issue and not ours to route around.
   *
   * So this booking is released by the spec's afterEach sweep instead of
   * through the page, and the outcome is read from the URL below.
   */
  releasableFromSuccess: false,

  async select(page: Page): Promise<void> {
    await new CarDetailsPage(page).selectTabbyPaymentMethod();
  },

  async complete(page: Page): Promise<void> {
    const tabby = new TabbyCheckoutPage(page);
    await tabby.expectOnTabby();
    await tabby.enterOtp(testData.payment.tabbyOtp);
    await tabby.confirmInstalmentPlan();
  },

  async expectSuccess(page: Page): Promise<void> {
    // URL-based for as long as the mixed-content block stands. Re-opening the
    // same address over http does render the dialog, but asserting that would
    // describe an experience no customer has and bury the defect.
    await new TabbyCheckoutPage(page).expectReturnedToCarwahWithSuccess();
  },
};

/** Every method a customer can pay a booking with. */
export const paymentMethods: PaymentMethod[] = [visaPayment, madaPayment, tabbyPayment];

/**
 * The card the booking-type specs pay with, so that what they cover is the
 * booking type rather than the payment. Mada finalization currently fails with
 * a backend 500, which is why the default is the credit card.
 */
export const defaultPaymentMethod = visaPayment;
