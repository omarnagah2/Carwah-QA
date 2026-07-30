import { expect, test } from '@playwright/test';
import { testData } from '../../src/config/test-data';
import { PartnerTagPage } from '../../src/pages/partner-tag.page';

// Each test gets its own browser context, so the sessionStorage a tag writes
// cannot leak into the next case — an applied tag otherwise keeps itself
// applied on later pages.
test.describe('Partner tag', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const { tag, message } of testData.partnerTags) {
    test(`should show the ${tag} banner and record the partner`, async ({ page }) => {
      const partnerTag = new PartnerTagPage(page);

      await partnerTag.openWithTag(tag);

      await partnerTag.expectPartnerBanner(message);

      // The app normalises the tag: lowercased, spaces become underscores.
      const expected = tag.toLowerCase().replace(/\s+/g, '_');
      const stored = await partnerTag.storedPartner();
      expect(stored.partner_tag?.toLowerCase()).toBe(expected);
      expect(stored.partner_track_id_tag?.toLowerCase()).toBe(expected);
      expect(stored.partner_track_id, 'partner track id should be a uuid').toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  }

  test('should keep the partner applied while browsing', async ({ page }) => {
    const partnerTag = new PartnerTagPage(page);
    const { tag, message } = testData.partnerTags[0];

    await partnerTag.openWithTag(tag);
    await partnerTag.expectPartnerBanner(message);

    await partnerTag.expectTagSurvivesNavigation(message);
    expect((await partnerTag.storedPartner()).partner_tag?.toLowerCase()).toBe(tag.toLowerCase().replace(/\s+/g, '_'));
  });

  test('should show no banner without a tag', async ({ page }) => {
    const partnerTag = new PartnerTagPage(page);

    await partnerTag.openWithoutTag();

    await partnerTag.expectNoPartnerBanner();
    expect(await partnerTag.storedPartner()).toEqual({});
  });

  test('should ignore an unrecognised tag', async ({ page }) => {
    const partnerTag = new PartnerTagPage(page);

    await partnerTag.openWithTag(testData.unknownPartnerTag);

    await partnerTag.expectNoPartnerBanner();
    expect(await partnerTag.storedPartner()).toEqual({});
  });
});
