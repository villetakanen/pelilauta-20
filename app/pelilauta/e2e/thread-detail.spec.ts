// E2E: Thread Detail page — specs/pelilauta/threads/spec.md
//
// Exercises the /threads/[threadKey] route for anonymous users.
// Thread data comes from the dev Firebase project — the exact threads available
// are not fixed; tests that require a real thread discover one via the front
// page and skip when the dev database is empty.

import { expect, test } from "@playwright/test";

// Heading is localised via t("threads:title"); default locale is `fi`
// ("Keskustelut"), but match both so the test survives a locale flip.
const threadsRegion = (page: import("@playwright/test").Page) =>
  page
    .locator("section.cn-content-triad div")
    .filter({ has: page.getByRole("heading", { name: /Threads|Keskustelut/i, level: 2 }) });

test.describe("Thread Detail", () => {
  test("front-page → detail navigation renders title + body", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    await expect(region).toBeVisible();

    const cards = region.locator("article.cn-card");
    const count = await cards.count();

    if (count === 0) {
      test.skip(count === 0, "No threads in dev database — skip detail navigation test");
    }

    // Find the first card that has a link starting with /threads/
    let threadLink: import("@playwright/test").Locator | null = null;
    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a[href^='/threads/']").first();
      if ((await link.count()) > 0) {
        threadLink = link;
        break;
      }
    }

    if (!threadLink) {
      test.skip(true, "No /threads/ links found in thread cards — skip detail navigation test");
      return;
    }

    await threadLink.click();

    // URL should match /threads/{some-key}
    await expect(page).toHaveURL(/\/threads\/[^/]+/);

    // Page should have returned 200 — check that the h1 is visible as proxy
    // (Playwright does not expose the HTTP status of a navigation triggered by
    // click, but a 404 would not render a content h1)
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    // Body should contain rendered HTML — at least one paragraph or inline
    // element proving markdown was converted upstream of the component
    const article = page.locator("article");
    await expect(article).not.toBeEmpty();
    const hasRenderedContent = await article.locator("p, strong, em").count();
    expect(hasRenderedContent).toBeGreaterThan(0);
  });

  test("missing thread key returns 404", async ({ page }) => {
    const randomSuffix = Date.now();
    const response = await page.goto(`/threads/this-thread-does-not-exist-${randomSuffix}`);
    expect(response?.status()).toBe(404);
  });
});
