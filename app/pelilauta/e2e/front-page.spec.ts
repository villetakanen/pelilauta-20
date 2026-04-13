import { expect, test } from "@playwright/test";

test.describe("Front Page", () => {
  test("renders all three triad regions with at least 3 cards each", async ({ page }) => {
    await page.goto("/");

    for (const heading of ["Threads", "Blog-roll", "Latest sites"]) {
      const section = page.locator("section.cn-content-triad").first();
      const region = section
        .locator("div")
        .filter({ has: page.getByRole("heading", { name: heading, level: 2 }) });
      await expect(region).toBeVisible();
      const cards = region.locator("article.cn-card");
      expect(await cards.count()).toBeGreaterThanOrEqual(3);
    }
  });

  test("triad renders side-by-side on wide viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const headings = await page.getByRole("heading", { level: 2 }).all();
    expect(headings.length).toBeGreaterThanOrEqual(3);

    // The three region headings should sit on roughly the same horizontal line
    // when the triad is rendered in wide mode.
    const boxes = await Promise.all(headings.slice(0, 3).map((h) => h.boundingBox()));
    const tops = boxes.map((b) => b?.y ?? 0);
    const spread = Math.max(...tops) - Math.min(...tops);
    expect(spread).toBeLessThan(50);
  });

  test("triad stacks on narrow viewports", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 900 });
    await page.goto("/");

    const headings = await page.getByRole("heading", { level: 2 }).all();
    expect(headings.length).toBeGreaterThanOrEqual(3);

    // When stacked, the three region headings are on distinct horizontal lines.
    const boxes = await Promise.all(headings.slice(0, 3).map((h) => h.boundingBox()));
    const tops = boxes.map((b) => b?.y ?? 0).sort((a, b) => a - b);
    expect(tops[1] - tops[0]).toBeGreaterThan(50);
    expect(tops[2] - tops[1]).toBeGreaterThan(50);
  });

  test("page is fully SSR with no client-side hydration scripts", async ({ page }) => {
    await page.goto("/");

    const hydrationScripts = page.locator(
      'script[data-astro-rerun], script[type="module"][src*="astro"]',
    );
    await expect(hydrationScripts).toHaveCount(0);
  });
});
