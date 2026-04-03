import { expect, test } from "@playwright/test";

test.describe("Tray and Rail Components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/tray");
  });

  test("Mobile View: Expanded drawer uses Elevation 4 and NO borders", async ({ page }) => {
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

  test("Tablet View: Expanded modal uses Elevation 4", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 800 });

    const drawer = page.locator(".cn-drawer");
    const toggle = page.locator("#cn-tray-toggle");

    // Toggle open
    await page.click('label[for="cn-tray-toggle"]');
    await expect(drawer).toBeInViewport();

    const boxShadow = await drawer.evaluate((node) => window.getComputedStyle(node).boxShadow);
    expect(boxShadow).not.toBe("none");
  });
});
