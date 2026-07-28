import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * The "search by extra service" strip on the home page: a Swiper carousel with
 * previous/next arrows that disable at each end.
 */
export class ExtraServiceCarousel extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get sectionHeading(): Locator {
    return this.page.getByRole('heading', { name: /ابحث حسب.*الخدمة/ });
  }

  private get container(): Locator {
    // The home page has several carousels; this is the one listing services, so
    // anchor on a service that is spelled the same in both languages.
    // The home page has several carousels, so anchor on a service spelled the
    // same in both languages. This matches exactly one container.
    return this.page.locator('.swiper-container:has(img[alt="GPS"])').first();
  }

  /** The arrows sit beside the container, not inside it. */
  private get wrapper(): Locator {
    return this.page.locator('.swiper-wrap:has(img[alt="GPS"])').first();
  }

  private get slides(): Locator {
    // A service card is a slide with artwork; the carousel also contains
    // structural slides that carry no card of their own.
    return this.container.locator('.swiper-slide:has(img)');
  }

  private get nextArrow(): Locator {
    return this.wrapper.locator('.swiper-button-next');
  }

  private get previousArrow(): Locator {
    return this.wrapper.locator('.swiper-button-prev');
  }

  /** Scroll the strip into view; it renders lazily like the rest of the page. */
  async scrollIntoView(): Promise<void> {
    for (let attempt = 0; attempt < 12 && (await this.container.count()) === 0; attempt += 1) {
      await this.page.mouse.wheel(0, 900);
      await this.page.waitForTimeout(400);
    }
    await expect(this.container).toBeVisible({ timeout: 30_000 });
    await this.sectionHeading.first().scrollIntoViewIfNeeded();
  }

  async expectSectionVisible(): Promise<void> {
    await expect(this.sectionHeading.first()).toBeVisible({ timeout: 30_000 });
    await expect(this.slides.first()).toBeVisible();
  }

  /** Every card's label, in carousel order. */
  async cardTitles(): Promise<string[]> {
    return this.slides.locator('img').evaluateAll((images) =>
      images.map((image) => (image.getAttribute('alt') ?? '').trim()),
    );
  }

  /** Labels of the cards actually on screen right now. */
  async visibleCardTitles(): Promise<string[]> {
    return this.slides.evaluateAll((slides) =>
      slides
        .filter((slide) => {
          const box = slide.getBoundingClientRect();
          const parent = slide.closest('.swiper-container');
          if (!parent) return false;
          const bounds = parent.getBoundingClientRect();
          // On screen and inside the carousel's own viewport.
          return box.width > 0 && box.right > bounds.left + 1 && box.left < bounds.right - 1;
        })
        .map((slide) => (slide.querySelector('img')?.getAttribute('alt') ?? '').trim()),
    );
  }

  async isNextEnabled(): Promise<boolean> {
    const className = (await this.nextArrow.getAttribute('class')) ?? '';
    return !/swiper-button-disable/.test(className);
  }

  async isPreviousEnabled(): Promise<boolean> {
    const className = (await this.previousArrow.getAttribute('class')) ?? '';
    return !/swiper-button-disable/.test(className);
  }

  async clickNext(): Promise<void> {
    await this.nextArrow.click();
    await this.page.waitForTimeout(700);
  }

  async clickPrevious(): Promise<void> {
    await this.previousArrow.click();
    await this.page.waitForTimeout(700);
  }

  /**
   * Every card carries a label and an image that actually loaded, so the
   * carousel never shows a blank or half-rendered placeholder.
   */
  async expectNoBlankCards(): Promise<void> {
    // Artwork is lazy, so give the on-screen cards a moment to finish loading
    // before deciding the carousel is showing a blank.
    await expect
      .poll(async () => (await this.findBrokenCards()).length, { timeout: 15_000 })
      .toBe(0);

    expect(await this.findBrokenCards(), 'carousel cards with no label or unloaded image').toEqual(
      [],
    );
  }

  private async findBrokenCards(): Promise<unknown[]> {
    return this.slides.evaluateAll((slides) =>
      slides
        .map((slide, index) => {
          const image = slide.querySelector('img');
          const label = (image?.getAttribute('alt') ?? '').trim();

          // Artwork loads lazily, so only cards currently on screen are
          // expected to have rendered theirs.
          const box = slide.getBoundingClientRect();
          const bounds = slide.closest('.swiper-container')?.getBoundingClientRect();
          const onScreen =
            !!bounds &&
            box.width > 0 &&
            box.right > bounds.left + 1 &&
            box.left < bounds.right - 1;
          const loaded = image ? image.complete && image.naturalWidth > 0 : false;

          return { index, label, loaded, onScreen };
        })
        .filter((card) => card.label === '' || (card.onScreen && !card.loaded)),
    );
  }

  async expectNoDuplicateCards(): Promise<void> {
    const titles = await this.cardTitles();
    expect(titles, 'duplicate cards in the carousel').toEqual([...new Set(titles)]);
  }
}
