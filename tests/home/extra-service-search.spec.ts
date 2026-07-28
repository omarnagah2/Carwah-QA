import { expect, test } from '@playwright/test';
import { HomePage } from '../../src/pages/home.page';
import { ExtraServiceCarousel } from '../../src/pages/extra-service-carousel.page';

test.describe('Search by extra service carousel', () => {
  // Browsing does not require signing in.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should page through every extra service and back again', async ({ page }) => {
    const homePage = new HomePage(page);
    const carousel = new ExtraServiceCarousel(page);

    // Anything that went wrong in the browser while the page was used.
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    // Firefox and WebKit log this on every page load because the site is served
    // over HTTP; it is the browser refusing geolocation, not a page fault.
    const ignoredConsoleNoise = /geolocation.*(insecure|secure context)/is;

    page.on('console', (message) => {
      if (message.type() === 'error' && !ignoredConsoleNoise.test(message.text())) {
        consoleErrors.push(message.text());
      }
    });
    page.on('response', async (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    // 1-3. Home page -> the extra service section.
    await homePage.openArabicHomePage();
    await carousel.scrollIntoView();
    await carousel.expectSectionVisible();

    // 4. Every card is a real, distinct service with its artwork loaded.
    //    NOTE: not compared against the `extraServices` GraphQL response — that
    //    query returns a different set to the one this strip renders, so the
    //    query actually feeding it still needs to be identified.
    const initialTitles = await carousel.cardTitles();
    expect(initialTitles.length).toBeGreaterThan(0);
    await carousel.expectNoDuplicateCards();
    await carousel.expectNoBlankCards();

    const firstView = await carousel.visibleCardTitles();
    expect(firstView.length).toBeGreaterThan(0);

    // 5-8. Page forward to the end. The strip must move each time and never
    //      show an empty slot, and it must stop at the last card.
    expect(await carousel.isPreviousEnabled(), 'cannot page back from the first card').toBe(false);

    let previousView = firstView;
    let steps = 0;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (!(await carousel.isNextEnabled())) {
        break;
      }

      await carousel.clickNext();
      const currentView = await carousel.visibleCardTitles();
      expect(currentView.length, 'carousel showed an empty page').toBeGreaterThan(0);

      // The last click can land on the end without shifting the cards, which is
      // how the carousel reports it has run out of items.
      if (currentView.join('|') === previousView.join('|')) {
        break;
      }

      await carousel.expectNoBlankCards();
      previousView = currentView;
      steps += 1;
    }

    expect(steps, 'next arrow never advanced the carousel').toBeGreaterThan(0);
    expect(await carousel.visibleCardTitles(), 'carousel did not reach the last card').toContain(
      initialTitles[initialTitles.length - 1],
    );

    // 9-12. Page back to the start and confirm the opening view is restored.
    for (let attempt = 0; attempt <= steps + 2; attempt += 1) {
      if (!(await carousel.isPreviousEnabled())) {
        break;
      }
      await carousel.clickPrevious();
      await carousel.expectNoBlankCards();
    }

    expect(await carousel.isPreviousEnabled(), 'cannot page back from the first card').toBe(false);
    expect(await carousel.visibleCardTitles()).toEqual(firstView);
    expect(await carousel.cardTitles()).toEqual(initialTitles);

    // The whole interaction should be quiet in the console and on the network.
    expect(consoleErrors, 'console errors during carousel use').toEqual([]);
    expect(failedRequests, 'failed requests during carousel use').toEqual([]);
  });
});
