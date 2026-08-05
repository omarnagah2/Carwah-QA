# Carwah UI — Playwright automation

E2E suite for **prewebsite.carwah.co** (Arabic-first, served over **HTTP**).
Playwright + TypeScript, Page Object Model. 42 tests.

## Layout

```
tests/
├── auth.setup.ts          # sign-in, runs once per run; all specs share it
├── auth/      login, logout
├── home/      coupon, vehicle-type-search, extra-service-search, partner-tag
└── booking/   booking (normal + pending alert), installment-booking,
               rent-to-own, delivery-booking, mada-booking, tabby-booking
src/pages/     page objects        src/utils/  shared navigation + auth helpers
src/config/    auth.ts, test-data.ts (all data, env-overridable)
```

## Commands

```bash
npx playwright test                     # full suite (1 worker by default)
npx playwright test tests/booking       # one area
SLOW_MO=300 npx playwright test --headed  # watchable pace
npm run health                          # is the backend up?
npm run reset:bookings                  # cancel pending reservations
npm run clean:cache                     # drop the cached Next.js bundle
FORCE_LOGIN=1 npx playwright test       # ignore the stored session
```

## Environment facts (learned the hard way)

- **HTTP only.** Chromium needs `--allow-running-insecure-content`. Geolocation is
  blocked on insecure origins, so Firefox/WebKit log a console error every load.
- **Pages rarely fire `load`** — always `waitUntil: 'domcontentloaded'`, and poll
  the URL rather than `waitForURL` when a third party is involved.
- **Pre-prod is unstable.** Timeouts and "element not found" bursts are usually the
  environment. Check `npm run health` and watch for `NS_ERROR_UNKNOWN_HOST`.
  `retries: 2` and the environment-classifier reporter exist for this.
- **The web origin rate-limits per IP**, and answers a tripped limit with a page
  whose whole body is `{"Message":"Rate limit exceed"}`. It throttles assets, not
  the GraphQL API, so the usual symptom is a blank page and a missing selector
  rather than anything mentioning a limit — check the trace for 429s before
  believing a selector broke. `src/utils/origin-routing.ts` keeps us under it:
  decorative assets are dropped, and the content-hashed `_next/static` bundle
  (~60% of our requests, and where every observed 429 landed) is cached on disk
  under `.cache/`, because each test gets a fresh context and so an empty HTTP
  cache. A 429 that survives backoff starts a cooldown in
  `src/utils/rate-limit.ts`, so the next test waits the window out instead of
  retrying into a hot limiter; `RATE_LIMIT_COOLDOWN_MS` tunes it.
- **Sessions are reused across runs** while the token is valid, so a normal run
  never touches the flaky OTP flow. `login.spec.ts` still exercises real login.
- **One customer, one sign-in per run**: `534271861`, in the single `setup`
  project; every spec reuses `playwright/.auth/user.json` + `session.json`.
  `installmentAccount` is now an alias of `primaryAccount`, not a second
  account. Carwah's one-pending-reservation-per-customer rule therefore applies
  across the whole suite — booking specs must not overlap, which the default
  single worker ensures. Two accounts used to exist for exactly that reason.
  `login.spec.ts` still signs in for real, since that is what it tests.
- **`rent-to-own.spec.ts`'s "other customer" check no longer proves anything**:
  it opens `installmentAccount` to assert a booked car is hidden from *other*
  customers, and that is now the same customer viewing their own booking.
- **A stored session is only reused when it belongs to the configured number.**
  `hasValidStoredSession` compares the session's `user.mobile` (which the app
  stores as `966…`) against `testData.login.phoneNumber`, so changing an account
  signs in again instead of silently running as the previous customer. Setup
  prints which customer it is authenticated as on every run.

## Booking rules

- **The search journey is city → duration → search**, in that order, and all
  three are real interactions with the home widget. Two traps:
  - The `أبرز المدن` ("Top Cities") heading is in the **footer**, not the
    dropdown. Its city entries are links that jump straight to a search,
    skipping the widget, the duration and the search button. Take the city from
    the dropdown under the pickup field (`span.color-4`) instead.
  - The date fields are `readonly`, so the duration can only be set through the
    calendar (react-multi-date-picker, `.rmdp-*`): click the pickup day, the
    return day, then `button#apply` — `تطبيق` alone also matches the coupon box.
  Defaults live in `testData.booking.duration` and reproduce the range the
  widget pre-fills (today, three days), so choosing it deliberately does not
  change which cars or prices come back.
- Searching now routes client-side, so a spec that reaches the car list twice
  finds the previous term still in the search box — `searchForCar` clears it
  first, or the terms concatenate and match nothing.
- A booking test needs **zero pending reservations**. That is a business
  precondition: tests **assert** it and fail fast; they do not cancel to force it.
  Clearing between runs is `npm run reset:bookings`.
- Payment-gateway specs are **Chromium-only** — the widgets and the lazily
  rendered car grid are not reliable on Firefox/WebKit.
- Cars/branches matter: the Renault (`رينو سيمبول`) branch pays without a delivery
  location; the Range Rover branch demands the fragile map picker. Pinned in
  test-data.
- **The branch is identified by its daily price**, not its location or
  confirmation type. All three allies for the pinned car sit at the same
  location, and `تأكيد فوري` is a feature a branch can have switched on or off —
  neither identifies anything. The pinned one is at 200/day, the others at 110.
  The block holding an ally is found by what it contains (`.inner-card` plus its
  `.price-label`), because its own class is a styled-components hash.
- The car-list search box matches Arabic and Latin alike, by design: `symbol`
  and `سيمبول` return the same results, so the term is not a language choice.
- **A booking is cancelled from its own details page**, never from a menu on the
  rentals list. `car-details?...&bookingId=…` carries a cancel action that opens
  the reasons dialog; the confirm button shares its label with the link that
  opened it, so it is taken by `button.cancelReasons`, and it stays disabled
  until a reason is chosen. Two ways in, both ending at
  `CarDetailsPage.cancelReservation()`: the payment-success dialog's
  `مشاهدة تفاصيل الحجز`, and clicking the pending card on `my-rentals` — the
  card is itself the link to the booking.

## Payment gotchas

- Tabby's OTP is a **controlled input**: `fill()` sets a value without the
  keystrokes its auto-submit listens for. Use `pressSequentially`. There is **no
  Continue** to press on the OTP page, and never `force`-click a plan tile.
- Tabby returns to **https** while the suite runs on http, so sessionStorage (and
  the auth token) is lost and the success dialog does not render — the test
  asserts `status=success` + `bookingId` in the URL instead. Unresolved: the
  return URL is built server-side; the client sends no return URL at all.
- HyperPay card payments occasionally fail the gateway callback;
  `CheckoutPage.payAndConfirm` retries the payment the way the app tells the
  customer to.

## Known product issues (report, don't work around)

- `renttoown.status.Success` — untranslated key shown to users on rent-to-own.
- Vehicle-type cards never render on WebKit and are not clickable on Firefox.
- The `extraServices` API response does not match the cards the home carousel shows.

## Pending work

1. **Payment-method refactor.** Specs are split on two axes (four booking types vs
   per-method specs). Introduce a `PaymentMethod` strategy (`select` / `complete` /
   `expectSuccess`) with Visa, Mada and Tabby implementations; keep one spec per
   booking type on the default card, plus one spec parameterised across methods.
   Tabby's `expectSuccess` stays URL-based until the https question is answered.
2. The environment-classifier reporter printed nothing for a run of 40
   environment-caused failures — investigate.
3. `installment`, `tabby`, `delivery` and `rent-to-own` still release their
   booking through the `afterEach` sweep only. Whichever of them ends on a
   success dialog could follow the same route the card specs now take.

## Working style that worked here

Explore the live site and confirm selectors before writing a test; report what
blocks rather than adding workarounds; when something fails, capture evidence
(URL, dialogs, network payloads) before theorising.
