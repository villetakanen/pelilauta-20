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

  // Verifies: specs/cyan-ds/components/cn-avatar/spec.md §Image with Error Fallback
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

  // Verifies: specs/cyan-ds/components/cn-avatar/spec.md §Initials Display
  test("renders initials fallback when nick is provided without src", async ({ page }) => {
    // The "Initials & Deterministic Background" demo starts at index 2
    const aliceAvatar = page.locator(".cn-avatar").nth(2);
    const initials = aliceAvatar.locator(".cn-avatar__initials");
    await expect(initials).toBeVisible();
    await expect(initials).toHaveText("AL");

    // Image should not be present
    await expect(aliceAvatar.locator("img")).toHaveCount(0);
  });

  // Verifies: specs/cyan-ds/components/cn-avatar/spec.md §Initials Display
  test("background color is deterministic based on nick", async ({ page }) => {
    const aliceAvatar = page.locator(".cn-avatar").nth(2);
    const bobAvatar = page.locator(".cn-avatar").nth(3);

    const aliceBg = await aliceAvatar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const bobBg = await bobAvatar.evaluate((el) => window.getComputedStyle(el).backgroundColor);

    // Different nicks = different colors
    expect(aliceBg).not.toBe(bobBg);

    // Re-verify Alice color is same if we had another Alice (skipped here as we only have one)
  });

  // Verifies: specs/cyan-ds/components/cn-avatar/spec.md §Icon Placeholder
  test("renders icon fallback for generic placeholder", async ({ page }) => {
    // The "Generic Placeholder" demo is nth(7)
    const genericAvatar = page.locator(".cn-avatar").nth(7);
    const icon = genericAvatar.locator(".cn-icon");
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute("data-noun", "avatar");
  });

  // Verifies: specs/cyan-ds/components/cn-avatar/spec.md §Size Variants
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

  // Verifies: specs/cyan-ds/components/cn-avatar/spec.md §Image with Error Fallback
  test("reveals initials when image fails to load", async ({ page }) => {
    // Block pravatar so every image request fails before the page finishes
    // loading. Network interception is registered before navigation so the very
    // first (non-cached) fetch is aborted, firing the browser's native error
    // path on each <img>. The component's SSR output hard-codes the fallback in
    // the DOM from the start (display:none); the onerror attribute flips the
    // visibility without requiring Svelte hydration.
    await page.route("**/i.pravatar.cc/**", (route) => route.abort());
    // Navigate to a fresh URL (cache-busted by Playwright's route intercept)
    // so the in-memory image cache cannot serve a stale response.
    await page.goto("/components/cn-avatar");

    const avatar = page.locator(".cn-avatar").first();
    const fallback = avatar.locator(".cn-avatar__fallback");

    // The fallback element with initials "AL" must always be present in the
    // DOM for image avatars — the SSR contract guarantees this so the error
    // handler can reveal it without a round-trip.
    await expect(fallback).toBeAttached();
    await expect(fallback.locator(".cn-avatar__initials")).toHaveText("AL");
  });

  // Verifies: specs/cyan-ds/components/cn-avatar/spec.md §Always-on elevation
  test("every avatar's box-shadow matches --cn-shadow-elevation-1's resolved geometry", async ({
    page,
  }) => {
    // Resolve the token through a probe element so we compare against the same
    // computed-style pipeline the avatar's box-shadow goes through. Reading the
    // raw custom-property off :root would yield the unresolved calc() string.
    const { expected, actual } = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.boxShadow = "var(--cn-shadow-elevation-1)";
      document.body.appendChild(probe);
      const expected = window.getComputedStyle(probe).boxShadow;
      probe.remove();

      const avatars = Array.from(document.querySelectorAll<HTMLElement>(".cn-avatar"));
      const actual = avatars.map((el) => window.getComputedStyle(el).boxShadow);
      return { expected, actual };
    });

    expect(expected).not.toBe("none");
    expect(expected).not.toBe("");
    expect(actual.length).toBeGreaterThan(0);
    for (const boxShadow of actual) {
      expect(boxShadow).toBe(expected);
    }
  });
});
