import { expect, test } from "@playwright/test";

test.describe("Buttons Core Styling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/core/buttons");
  });

  test("bare button has correct dimensions and shape", async ({ page }) => {
    const button = page.locator("button").first();
    const box = await button.boundingBox();
    expect(box?.height).toBeCloseTo(38, 0);

    const borderRadius = await button.evaluate((el) => window.getComputedStyle(el).borderRadius);
    expect(borderRadius).toBe("19px");
  });

  test("button surface is a 137deg linear gradient", async ({ page }) => {
    const button = page.locator("button").first();
    const bgImage = await button.evaluate((el) => window.getComputedStyle(el).backgroundImage);
    expect(bgImage).toContain("linear-gradient");
    // Note: Browsers might normalize 137deg or resolve it.
    // We check for the presence of the gradient and potentially the color stops indirectly.
    expect(bgImage).toContain("137deg");
  });

  test("CTA variant uses the correct surface", async ({ page }) => {
    const ctaButton = page.locator("button.cta").first();
    const bgImage = await ctaButton.evaluate((el) => window.getComputedStyle(el).backgroundImage);
    expect(bgImage).toContain("linear-gradient");
    expect(bgImage).toContain("137deg");

    const color = await ctaButton.evaluate((el) => window.getComputedStyle(el).color);
    // Should be white (var(--chroma-surface-100))
    // Matches rgb(255, 255, 255), #ffffff, or oklch(1 0 ...)
    expect(color).toMatch(/(rgb\(255,\s*255,\s*255\)|#ffffff|oklch\(1\s+0\s+[\d.]+\))/);
  });

  test("disabled button is inert", async ({ page }) => {
    const disabledButton = page.locator("button[disabled]").first();

    const opacity = await disabledButton.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeCloseTo(0.5, 1);

    const pointerEvents = await disabledButton.evaluate(
      (el) => window.getComputedStyle(el).pointerEvents,
    );
    expect(pointerEvents).toBe("none");
  });

  test("icon size is forced to small (24px)", async ({ page }) => {
    const icon = page.locator("button .cn-icon").first();
    await expect(icon).toHaveCSS("width", "24px");
    await expect(icon).toHaveCSS("height", "24px");
  });

  test("icon-only button is circular", async ({ page }) => {
    const iconOnlyButton = page.locator("button:has(.cn-icon:only-child)").first();
    await expect(iconOnlyButton).toHaveCSS("width", "38px");
    await expect(iconOnlyButton).toHaveCSS("height", "38px");
  });

  test(".text variant has no gradient surface", async ({ page }) => {
    const textButton = page.locator("button.text").first();
    const bgImage = await textButton.evaluate((el) => window.getComputedStyle(el).backgroundImage);
    expect(bgImage).toBe("none");
  });

  test(".secondary ancestor re-tints default children", async ({ page }) => {
    const secondaryDefault = page.locator(".secondary button:not(.cta):not(.text)").first();
    const secondaryBg = await secondaryDefault.evaluate(
      (el) => window.getComputedStyle(el).backgroundImage,
    );
    expect(secondaryBg).toContain("linear-gradient");
    expect(secondaryBg).toContain("137deg");

    // Must differ from a plain (non-secondary) default button — otherwise the
    // .secondary rule silently collapsed back to --cn-button surface.
    const plainDefault = page.locator(":not(.secondary) > button:not(.cta):not(.text)").first();
    const plainBg = await plainDefault.evaluate(
      (el) => window.getComputedStyle(el).backgroundImage,
    );
    expect(secondaryBg).not.toBe(plainBg);
  });

  test("<a class='button'> matches button geometry and suppresses underline", async ({ page }) => {
    const anchorButton = page.locator("a.button").first();
    const box = await anchorButton.boundingBox();
    expect(box?.height).toBeCloseTo(38, 0);

    const borderRadius = await anchorButton.evaluate(
      (el) => window.getComputedStyle(el).borderRadius,
    );
    expect(borderRadius).toBe("19px");

    const textDecoration = await anchorButton.evaluate(
      (el) => window.getComputedStyle(el).textDecorationLine,
    );
    expect(textDecoration).toBe("none");
  });
});
