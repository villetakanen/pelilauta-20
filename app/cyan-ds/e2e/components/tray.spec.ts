import { expect, test } from "@playwright/test";

test.describe("Tray and Rail Components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/tray");
  });

  test("Mobile View: Expanded drawer uses Elevation 3 and NO borders", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const drawer = page.locator(".cn-drawer");
    const toggle = page.locator("#cn-tray-toggle");

    // Check initial state (off-screen)
    await expect(drawer).not.toBeInViewport();

    // Toggle open via label (since input is hidden)
    await page.click('label[for="cn-tray-toggle"]');
    await expect(drawer).toBeInViewport();

    const style = await drawer.evaluate((node) => {
      const s = window.getComputedStyle(node);
      return {
        boxShadow: s.boxShadow,
        borderRight: s.borderRight,
        borderLeft: s.borderLeft,
        borderTop: s.borderTop,
        borderBottom: s.borderBottom,
      };
    });

    // Verify Elevation 4 shadow exists
    expect(style.boxShadow).not.toBe("none");
    expect(style.boxShadow).not.toBe("");

    // Verify NO borders
    expect(style.borderRight).toContain("none");
    expect(style.borderLeft).toContain("none");
  });

  test("Desktop View: Rail mode has NO elevation and NO borders", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const drawer = page.locator(".cn-drawer");

    await expect(drawer).toBeVisible();

    const style = await drawer.evaluate((node) => {
      const s = window.getComputedStyle(node);
      return {
        boxShadow: s.boxShadow,
        borderRight: s.borderRight,
        borderLeft: s.borderLeft,
      };
    });

    // Verify Elevation 0 shadow
    expect(style.boxShadow).toBe("none");

    // Verify NO borders
    expect(style.borderRight).toContain("none");
  });

  test("Tablet View: Expanded modal uses Elevation 0", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 800 });

    const drawer = page.locator(".cn-drawer");
    const toggle = page.locator("#cn-tray-toggle");

    // Toggle open
    await page.click('label[for="cn-tray-toggle"]');
    await expect(drawer).toBeInViewport();

    const boxShadow = await drawer.evaluate((node) => window.getComputedStyle(node).boxShadow);
    expect(boxShadow).toBe("none");
  });

  test("Desktop View (1200px): Expanded drawer MUST PUSH main content", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const main = page.locator(".cn-app-main");

    // Initial x-position
    const initialBox = await main.boundingBox();
    const initialX = initialBox?.x || 0;

    // Toggle open
    await page.click('label[for="cn-tray-toggle"]');
    await page.waitForTimeout(300); // Wait for transition

    const expandedBox = await main.boundingBox();
    const expandedX = expandedBox?.x || 0;

    // Displacement should be approximately the drawer width minus rail width
    // (336px - 80px = 256px displacement)
    expect(expandedX).toBeGreaterThan(initialX + 200);
  });

  test("Tablet View (700px): Expanded drawer MUST NOT push main content", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 800 });

    const main = page.locator(".cn-app-main");

    // Initial x-position
    const initialBox = await main.boundingBox();
    const initialX = initialBox?.x || 0;

    // Toggle open
    await page.click('label[for="cn-tray-toggle"]');
    await page.waitForTimeout(300); // Wait for transition

    const expandedBox = await main.boundingBox();
    const expandedX = expandedBox?.x || 0;

    // In overlay mode, the grid column width remains the same (80px)
    // There might be a small difference due to scrollbars, but not 256px.
    expect(Math.abs(expandedX - initialX)).toBeLessThan(10);
  });
});
