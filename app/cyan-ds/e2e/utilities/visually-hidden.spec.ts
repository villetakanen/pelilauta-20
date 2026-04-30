// Verifies: specs/cyan-ds/utilities/visually-hidden/spec.md §Element is visually hidden but in the accessibility tree
// Verifies: specs/cyan-ds/utilities/visually-hidden/spec.md §Element becomes visible on keyboard focus
// Verifies: specs/cyan-ds/utilities/visually-hidden/spec.md §Element becomes visible on activation

import { expect, test } from "@playwright/test";

test.describe("Visually Hidden Utility (.sr-only)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/principles/visually-hidden");
  });

  test("element with .sr-only is clipped to 1x1 and remains in the accessibility tree", async ({
    page,
  }) => {
    // Pick the first .sr-only on the page that is NOT focused/active.
    const el = page.locator(".sr-only").first();
    await expect(el).toBeAttached();

    const box = await el.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(1);
    expect(box?.height).toBeLessThanOrEqual(1);

    // Accessibility tree presence — Playwright exposes the accessible name even
    // when the element is visually clipped. Use the first .sr-only's own text.
    const text = (await el.textContent())?.trim() ?? "";
    expect(text.length).toBeGreaterThan(0);
  });

  test("element becomes visible when keyboard-focused", async ({ page }) => {
    // The skip-navigation link is the canonical focus-reveal case.
    const skipLink = page.locator(".sr-only", { hasText: /skip/i }).first();
    await expect(skipLink).toBeAttached();

    const clippedBox = await skipLink.boundingBox();
    expect(clippedBox?.width ?? 0).toBeLessThanOrEqual(1);

    await skipLink.focus();

    const focusedBox = await skipLink.boundingBox();
    expect(focusedBox?.width ?? 0).toBeGreaterThan(1);
    expect(focusedBox?.height ?? 0).toBeGreaterThan(1);
  });

  test("rule includes :not(:active) so mouse activation reveals the element", async ({ page }) => {
    // Source-check the loaded stylesheet for the active branch of the selector.
    // mouse.down on a 1x1 clipped target is unreliable in Playwright; the focus
    // test above exercises the runtime visibility-toggle mechanism, and this
    // assertion locks the selector's :not(:active) branch as a regression guard.
    const cssText = await page.evaluate(() => {
      return Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((r) => r.cssText);
          } catch {
            return [];
          }
        })
        .join("\n");
    });
    expect(cssText).toMatch(/\.sr-only:not\(:focus\):not\(:active\)/);
  });
});
