import { expect, test } from "@playwright/test";

test.describe("Content Grids", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Content Grids documentation page
    await page.goto("/principles/content-grids");
  });

  test("Prose: Centering and 67ch readability", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const section = page.locator(".cn-content-prose").first();
    const child = section.locator("h3").first();

    const childWidth = await child.evaluate((node) => node.getBoundingClientRect().width);

    // 67ch is roughly 600-700px
    expect(childWidth).toBeLessThan(750);
    expect(childWidth).toBeGreaterThan(500);

    const sectionBox = await section.boundingBox();
    const childBox = await child.boundingBox();

    if (sectionBox && childBox) {
      const leftOffset = childBox.x - sectionBox.x;
      const rightOffset = sectionBox.x + sectionBox.width - (childBox.x + childBox.width);
      expect(Math.abs(leftOffset - rightOffset)).toBeLessThan(5);
    }
  });

  test("Golden: Two-Column Ratio (2.618:1)", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const section = page.locator(".cn-content-golden").first();
    const main = section.locator("div").nth(0);
    const sidebar = section.locator("div").nth(1);

    const mainWidth = await main.evaluate((node) => node.getBoundingClientRect().width);
    const sidebarWidth = await sidebar.evaluate((node) => node.getBoundingClientRect().width);

    const ratio = mainWidth / sidebarWidth;
    // We expect approx 2.618
    expect(Math.abs(ratio - 2.618)).toBeLessThan(0.1);
  });

  test("Triad: Three-Column Ratio (1.618:1:1)", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const section = page.locator(".cn-content-triad").first();
    const primary = section.locator("div").nth(0);
    const secondary = section.locator("div").nth(1);
    const tertiary = section.locator("div").nth(2);

    const w1 = await primary.evaluate((node) => node.getBoundingClientRect().width);
    const w2 = await secondary.evaluate((node) => node.getBoundingClientRect().width);
    const w3 = await tertiary.evaluate((node) => node.getBoundingClientRect().width);

    const ratio12 = w1 / w2;
    const ratio23 = w2 / w3;

    expect(Math.abs(ratio12 - 1.618)).toBeLessThan(0.1);
    expect(Math.abs(ratio23 - 1.0)).toBeLessThan(0.05);
  });

  test("Narrow Collapse: All variants stack", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });

    const variants = [".cn-content-prose", ".cn-content-golden", ".cn-content-triad"];

    for (const selector of variants) {
      const section = page.locator(selector).first();
      const child = section.locator("div, h3, p").first();

      const sectionBox = await section.boundingBox();
      const childBox = await child.boundingBox();

      if (sectionBox && childBox) {
        // Dynamically get the computed --cn-gap value in pixels.
        // We read the first column width directly from the grid template.
        const gapPx = await section.evaluate((el) => {
          const style = window.getComputedStyle(el);
          const cols = style.gridTemplateColumns.split(" ");
          return parseFloat(cols[0]) || 16;
        });

        // The child (column 2) should be offset by exactly the gap (column 1)
        expect(Math.abs(childBox.x - sectionBox.x - gapPx)).toBeLessThan(5);
        // Should span nearly full width (minus both gutters)
        expect(Math.abs(childBox.width - (sectionBox.width - gapPx * 2))).toBeLessThan(5);
      }
    }
  });

  test("Utility: Full-width override", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });

    const section = page.locator(".cn-content-prose").nth(1); // The one with .cn-grid-full
    const fullWidthDiv = section.locator(".cn-grid-full");

    const sectionBox = await section.boundingBox();
    const fullBox = await fullWidthDiv.boundingBox();

    if (sectionBox && fullBox) {
      expect(Math.floor(fullBox.width)).toBe(Math.floor(sectionBox.width));
      expect(Math.floor(fullBox.x)).toBe(Math.floor(sectionBox.x));
    }
  });

  test("Robustness: Mixed-type children placement", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const section = page.locator(".cn-grid-mixed").first();
    const main = section.locator("article");
    const sidebar = section.locator("aside");

    const mainBox = await main.boundingBox();
    const sidebarBox = await sidebar.boundingBox();

    if (mainBox && sidebarBox) {
      // Should be side-by-side
      expect(mainBox.y).toBe(sidebarBox.y);
      // Main should be wider than sidebar (golden ratio)
      expect(mainBox.width).toBeGreaterThan(sidebarBox.width);
      expect(Math.abs(mainBox.width / sidebarBox.width - 2.618)).toBeLessThan(0.1);
    }
  });
});
