import { expect, test } from "@playwright/test";

test.describe("CnCard — Linked Title (not Linked Card)", () => {
  test("root element is <article>, title contains <a> link", async ({ page }) => {
    // Navigate to a page that renders CnCard with href
    await page.goto("/");

    const card = page.locator("article.cn-card").first();
    await expect(card).toBeVisible();

    // Root must be <article>, never <a>
    const tagName = await card.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("article");

    // Title link inside <h4>
    const titleLink = card.locator("h4.title a");
    if ((await titleLink.count()) > 0) {
      await expect(titleLink.first()).toHaveAttribute("href");
      // Focus ring: focus-visible should apply an outline
      await titleLink.first().focus();
      const outline = await titleLink.first().evaluate((el) => getComputedStyle(el).outlineStyle);
      expect(outline).not.toBe("none");
    }
  });
});
