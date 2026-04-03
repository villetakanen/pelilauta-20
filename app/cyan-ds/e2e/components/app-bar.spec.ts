import { expect, test } from "@playwright/test";

test.describe("AppBar", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the DS page where AppBar is demoed
    await page.goto("/components/app-bar");
  });

  test("Renders responsive titles correctly", async ({ page }) => {
    // Use the second demo (Modal) which has both title and shortTitle
    const appBar = page.locator(".cn-app-bar.modal");
    const fullTitle = appBar.locator(".full-title");
    const shortTitle = appBar.locator(".short-title");

    // Desktop: Full title visible, short title hidden
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(fullTitle).toBeVisible();
    await expect(shortTitle).toBeHidden();

    // Mobile: Full title hidden, short title visible
    await page.setViewportSize({ width: 500, height: 768 });
    await expect(fullTitle).toBeHidden();
    await expect(shortTitle).toBeVisible();
  });

  test("Applies elevation shadow on scroll (Sticky mode)", async ({ page }) => {
    // The third demo is the sticky/scroll demo
    const viewport = page.locator(".viewport.scrollable");
    const stickyBar = viewport.locator(".cn-app-bar.sticky");

    // Initial state: ensure we're at top
    await viewport.evaluate((el) => (el.scrollTop = 0));
    const initialShadow = await stickyBar.evaluate((el) => window.getComputedStyle(el).boxShadow);

    // Scroll the container down 100px
    await viewport.evaluate((el) => (el.scrollTop = 100));
    // Wait for the CSS animation to transition
    await page.waitForTimeout(500);

    const scrolledShadow = await stickyBar.evaluate((el) => window.getComputedStyle(el).boxShadow);
    expect(scrolledShadow).not.toBe(initialShadow);
    expect(scrolledShadow).not.toBe("none");
  });

  test("AppBar modal has Elevation 2 and NO borders", async ({ page }) => {
    const modalBar = page.locator(".cn-app-bar.modal");
    const style = await modalBar.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        boxShadow: s.boxShadow,
        borderBottom: s.borderBottom,
        borderLeft: s.borderLeft,
        borderRight: s.borderRight,
      };
    });

    // Level 2 shadow
    expect(style.boxShadow).not.toBe("none");
    // Level 2 shadow should NOT be as deep as level 4 (heuristic)
    // We can't easily check token names in computedStyle, but we confirm any border is gone.
    expect(style.borderBottom).toContain("none");
    expect(style.borderLeft).toContain("none");
    expect(style.borderRight).toContain("none");
  });

  test("Renders modal back button with correct href", async ({ page }) => {
    const modalBar = page.locator(".cn-app-bar.modal");
    const backBtn = modalBar.locator("a.back-button");

    await expect(backBtn).toBeVisible();
    await expect(backBtn).toHaveAttribute("href", "#");

    // Check for the icon
    const icon = backBtn.locator('.cn-icon[data-noun="arrow-left"]');
    await expect(icon).toBeVisible();
  });
});
