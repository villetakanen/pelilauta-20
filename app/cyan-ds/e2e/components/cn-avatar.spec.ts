import { expect, test } from "@playwright/test";

/**
 * cn-avatar.spec.ts
 * E2E tests for the CnAvatar component in the Living Style Book.
 */

test.describe("CnAvatar Component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/cn-avatar");
  });

  test("page loads with CnAvatar documentation", async ({ page }) => {
    await expect(page.locator("h1")).toHaveText("CnAvatar");
  });

  test("renders image correctly when src is provided", async ({ page }) => {
    const avatar = page.locator(".cn-avatar").first();
    const img = avatar.locator("img");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("src", /pravatar\.cc/);
    await expect(img).toHaveAttribute("loading", "lazy");

    // Fallback layer should be hidden when image is successful
    const fallback = avatar.locator(".cn-avatar__fallback");
    await expect(fallback).toBeHidden();
  });

  test("renders initials fallback when nick is provided without src", async ({ page }) => {
    // The "Initials & Deterministic Background" demo starts at index 2
    const aliceAvatar = page.locator(".cn-avatar").nth(2);
    const initials = aliceAvatar.locator(".cn-avatar__initials");
    await expect(initials).toBeVisible();
    await expect(initials).toHaveText("AL");

    // Image should not be present
    await expect(aliceAvatar.locator("img")).toHaveCount(0);
  });

  test("background color is deterministic based on nick", async ({ page }) => {
    const aliceAvatar = page.locator(".cn-avatar").nth(2);
    const bobAvatar = page.locator(".cn-avatar").nth(3);

    const aliceBg = await aliceAvatar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const bobBg = await bobAvatar.evaluate((el) => window.getComputedStyle(el).backgroundColor);

    // Different nicks = different colors
    expect(aliceBg).not.toBe(bobBg);

    // Re-verify Alice color is same if we had another Alice (skipped here as we only have one)
  });

  test("renders icon fallback for generic placeholder", async ({ page }) => {
    // The "Generic Placeholder" demo is nth(7)
    const genericAvatar = page.locator(".cn-avatar").nth(7);
    const icon = genericAvatar.locator(".cn-icon");
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute("data-noun", "avatar");
  });

  test("sizes scale correctly (36px vs 48px)", async ({ page }) => {
    const smallAvatar = page.locator('.cn-avatar[data-size="small"]');
    const mediumAvatar = page.locator('.cn-avatar[data-size="medium"]').first();

    const smallBox = await smallAvatar.boundingBox();
    const mediumBox = await mediumAvatar.boundingBox();

    // --cn-line is 24px. 24 * 1.5 = 36. 24 * 2 = 48.
    expect(smallBox?.width).toBe(36);
    expect(smallBox?.height).toBe(36);
    expect(mediumBox?.width).toBe(48);
    expect(mediumBox?.height).toBe(48);
  });

  test("reveals initials when image fails to load", async ({ page }) => {
    // Manually trigger error on an image that is present
    const avatar = page.locator(".cn-avatar").first();
    const img = avatar.locator("img");
    const fallback = avatar.locator(".cn-avatar__fallback");

    await expect(img).toBeVisible();
    await expect(fallback).toBeHidden();

    // Trigger onerror manually
    await img.evaluate((node: HTMLImageElement) => node.dispatchEvent(new Event("error")));

    await expect(img).toBeHidden();
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveText("AL");
  });
});
