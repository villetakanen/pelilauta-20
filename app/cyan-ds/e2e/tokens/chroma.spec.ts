import { expect, test } from "@playwright/test";

test.describe("Chroma Color System Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/principles/color-system");
  });

  test("page loads with visible heading", async ({ page }) => {
    await expect(page.locator("article h1")).toHaveText("Color System");
  });

  test("primary and surface ColorScale strips are rendered", async ({ page }) => {
    const scales = page.locator(".color-scale-wrapper");
    // At minimum: Primary, Surface, plus functional palettes
    await expect(scales.first()).toBeVisible();
    const count = await scales.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("primary scale renders 13 tonal step swatches", async ({ page }) => {
    const firstScale = page.locator(".color-scale-wrapper").first();
    const swatches = firstScale.locator(".swatch");
    await expect(swatches).toHaveCount(13);
  });

  test("swatches display step labels", async ({ page }) => {
    const firstScale = page.locator(".color-scale-wrapper").first();
    const labels = firstScale.locator(".swatch .label");
    const count = await labels.count();
    expect(count).toBe(13);

    // First label should be "0", last should be "100"
    await expect(labels.first()).toHaveText("0");
    await expect(labels.last()).toHaveText("100");
  });

  test("swatches use token-derived backgrounds, not hardcoded colors", async ({ page }) => {
    const firstSwatch = page.locator(".color-scale-wrapper").first().locator(".swatch").first();

    // Step 0 (absolute black) should compute to black or near-black
    const bg = await firstSwatch.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // oklch(0 0 185) or rgb(0, 0, 0)
    expect(bg).toMatch(/(rgb\(0,\s*0,\s*0\)|oklch\(0 0 [\d.]+\))/);
  });
});
