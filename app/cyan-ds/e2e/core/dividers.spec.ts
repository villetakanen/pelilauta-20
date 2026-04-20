import { expect, test } from "@playwright/test";

test.describe("Dividers Core Styling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/core/dividers");
  });

  test("bare <hr> renders as a 1px grid-aligned rule", async ({ page }) => {
    const hr = page.locator("hr").first();
    await expect(hr).toHaveCSS("height", "1px");
    // --cn-line resolves to calc(0.5rem * 3) = 1.5rem = 24px at root.
    await expect(hr).toHaveCSS("margin-top", "24px");
    await expect(hr).toHaveCSS("margin-bottom", "24px");
  });

  test("<hr> uses background-color, not border-top", async ({ page }) => {
    const hr = page.locator("hr").first();
    const borderTopStyle = await hr.evaluate((el) => window.getComputedStyle(el).borderTopStyle);
    expect(borderTopStyle).toBe("none");

    const bg = await hr.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // Resolves from --cn-border — must be a non-transparent colour.
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });
});
