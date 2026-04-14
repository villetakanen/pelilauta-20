// E2E: Top Threads Stream — specs/pelilauta/front-page/top-threads-stream/spec.md
//
// These tests run against the built site (pnpm preview). Thread data comes
// from the dev Firebase project — the exact count depends on what's in the
// database, but the structural contracts (max 5 cards, show-more link always
// present, error isolation, lang stamps) hold regardless.

import { expect, test } from "@playwright/test";

const threadsRegion = (page: import("@playwright/test").Page) =>
  page
    .locator("section.cn-content-triad div")
    .filter({ has: page.getByRole("heading", { name: "Threads", level: 2 }) });

test.describe("TopThreadsStream", () => {
  test("renders at most 5 thread cards", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    await expect(region).toBeVisible();

    const cards = region.locator("article.cn-card");
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(5);
  });

  test("show-more link to /channels is always present", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    const showMore = region.getByRole("link", { name: /show more|näytä lisää/i });
    await expect(showMore).toBeVisible();
    expect(await showMore.getAttribute("href")).toBe("/channels");
  });

  test("thread cards link to /threads/{key}", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    const cards = region.locator("article.cn-card");
    const count = await cards.count();

    if (count === 0) {
      test.skip(count === 0, "No threads in dev database — skip link assertion");
    }

    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a[href^='/threads/']").first();
      await expect(link).toBeVisible();
    }
  });

  test("thread cards stamp lang attribute from thread locale", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    const langElements = region.locator("[lang]");
    const count = await langElements.count();

    if (count === 0) {
      test.skip(count === 0, "No threads in dev database — skip lang assertion");
    }

    for (let i = 0; i < count; i++) {
      const lang = await langElements.nth(i).getAttribute("lang");
      expect(lang).toBeTruthy();
    }
  });

  test("page returns 200 even when threads region is present", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("stream container has no lang attribute (inherits from html)", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    const regionLang = await region.getAttribute("lang");
    expect(regionLang).toBeNull();
  });
});
