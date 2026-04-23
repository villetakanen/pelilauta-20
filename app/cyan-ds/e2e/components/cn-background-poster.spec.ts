import { expect, test } from "@playwright/test";

test.describe("CnBackgroundPoster", () => {
  test("singleton mount with decorative alt and lazy loading", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/components/cn-background-poster");

    const posters = page.locator("#cn-background-poster");
    await expect(posters).toHaveCount(1);

    const img = posters.locator("img").first();
    await expect(img).toHaveAttribute("alt", "");
    await expect(img).toHaveAttribute("loading", "lazy");
  });

  test("hidden below 620px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto("/components/cn-background-poster");

    const poster = page.locator("#cn-background-poster");
    await expect(poster).toHaveCSS("display", "none");
  });

  test("dark theme: image opacity 0.72 with no filter", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/components/cn-background-poster");

    const img = page.locator("#cn-background-poster img").first();
    await expect(img).toHaveCSS("opacity", "0.72");

    const filter = await img.evaluate((el) => window.getComputedStyle(el).filter);
    // Browsers serialize an unset filter as "none".
    expect(filter === "none" || filter === "").toBeTruthy();
  });

  test("light theme: image opacity 0.72 with no filter", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/components/cn-background-poster");

    const img = page.locator("#cn-background-poster img").first();
    await expect(img).toHaveCSS("opacity", "0.72");

    const filter = await img.evaluate((el) => window.getComputedStyle(el).filter);
    // Browsers serialize an unset filter as "none".
    expect(filter === "none" || filter === "").toBeTruthy();
  });
});
