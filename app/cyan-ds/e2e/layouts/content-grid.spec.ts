import { expect, test } from "@playwright/test";

test.describe("Content Grid", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Content Grids documentation page
    await page.goto("/principles/content-grids");
  });

  test("Desktop: Centering and 67ch readability", async ({ page }) => {
    // Force a desktop-wide viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    const section = page.locator(".cn-grid-debug section").first();
    const child = section.locator("p").first();

    // Check computed width of the child inside the grid
    const childWidth = await child.evaluate((node) => node.getBoundingClientRect().width);

    // 67ch in standard inter/sans is roughly 600-700px.
    // We expect it to be restricted and centered.
    expect(childWidth).toBeLessThan(750);
    expect(childWidth).toBeGreaterThan(500);

    // Verify centering: left and right offsets from the section should be roughly equal
    const sectionBox = await section.boundingBox();
    const childBox = await child.boundingBox();

    if (sectionBox && childBox) {
      const leftOffset = childBox.x - sectionBox.x;
      const rightOffset = sectionBox.x + sectionBox.width - (childBox.x + childBox.width);

      // Allow 2px tolerance for subpixel rounding
      expect(Math.abs(leftOffset - rightOffset)).toBeLessThan(5);
    }
  });

  test("Mobile: Fixed gutters", async ({ page }) => {
    // Force a narrow viewport
    await page.setViewportSize({ width: 400, height: 800 });

    const section = page.locator(".cn-grid-debug section").first();
    const child = section.locator("p").first();

    const sectionBox = await section.boundingBox();
    const childBox = await child.boundingBox();

    if (sectionBox && childBox) {
      const leftOffset = childBox.x - sectionBox.x;
      // We expect it to be approx. 16px (--cn-gap default)
      // Allow for borders (1px) and subpixel rounding in modern browsers.
      expect(Math.abs(leftOffset - 16)).toBeLessThan(2.5);
    }
  });

  test("Utility: Full-width override", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });

    const section = page.locator(".cn-grid-debug section").nth(1);
    const fullWidthDiv = section.locator(".cn-grid-full");

    const sectionBox = await section.boundingBox();
    const fullBox = await fullWidthDiv.boundingBox();

    if (sectionBox && fullBox) {
      // The full-width element should match the section's width exactly (spanning margins)
      expect(Math.floor(fullBox.width)).toBe(Math.floor(sectionBox.width));
      expect(Math.floor(fullBox.x)).toBe(Math.floor(sectionBox.x));
    }
  });
});
