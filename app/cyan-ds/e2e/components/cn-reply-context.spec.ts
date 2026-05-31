// E2E tests for CnReplyContext. These cover spec scenarios that require a real
// CSS layout engine: ellipsis truncation (computed style + layout), light-dark
// token resolution. Structural and callback coverage lives in
// packages/cyan/src/components/CnReplyContext.test.ts.
//
// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders username and text snippet
// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Clicking close triggers dismiss event
// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders avatar when provided

import { expect, test } from "@playwright/test";

test.describe("CnReplyContext — structure and truncation", () => {
  // Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders username and text snippet
  test("renders username prefixed with @ and text snippet", async ({ page }) => {
    await page.goto("/components/cn-reply-context");
    const banner = page.locator(".cn-reply-context").first();
    await expect(banner).toBeVisible();

    const username = banner.locator(".cn-reply-context__username");
    await expect(username).toBeVisible();
    await expect(username).toHaveText("@tapa");

    const snippet = banner.locator(".cn-reply-context__snippet");
    await expect(snippet).toBeVisible();
  });

  test("dismiss button is visible and has accessible label", async ({ page }) => {
    await page.goto("/components/cn-reply-context");
    const button = page.locator(".cn-reply-context__dismiss").first();
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-label", "Dismiss reply to @tapa");
  });

  // Regression guardrail: long text must never wrap or expand the banner height.
  // Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders username and text snippet
  test("long text snippet is clamped to a single line via ellipsis (truncation guardrail)", async ({
    page,
  }) => {
    await page.goto("/components/cn-reply-context");

    // Select the long-snippet example — it's the third .cn-reply-context on the page
    const snippets = page.locator(".cn-reply-context__snippet");
    const count = await snippets.count();
    // There are at least 3 banners on the page (with-avatar, without-avatar, long-snippet)
    expect(count).toBeGreaterThanOrEqual(3);

    // Inspect the third banner's snippet element for truncation CSS
    const longSnippet = snippets.nth(2);
    await expect(longSnippet).toBeVisible();

    const { overflow, whiteSpace, textOverflow } = await longSnippet.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        overflow: cs.overflow,
        whiteSpace: cs.whiteSpace,
        textOverflow: cs.textOverflow,
      };
    });

    expect(overflow === "hidden" || overflow.startsWith("hidden")).toBe(true);
    expect(whiteSpace).toBe("nowrap");
    expect(textOverflow).toBe("ellipsis");
  });

  test("long snippet does not cause the banner height to grow beyond a single line", async ({
    page,
  }) => {
    await page.goto("/components/cn-reply-context");

    const banners = page.locator(".cn-reply-context");
    const firstBannerHeight = await banners
      .nth(0)
      .evaluate((el) => el.getBoundingClientRect().height);
    const longBannerHeight = await banners
      .nth(2)
      .evaluate((el) => el.getBoundingClientRect().height);

    // The long-content banner must not be taller than the short ones (allow 4px rounding)
    expect(longBannerHeight).toBeLessThanOrEqual(firstBannerHeight + 4);
  });

  // Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders avatar when provided
  test("with-avatar demo renders a CnAvatar element", async ({ page }) => {
    await page.goto("/components/cn-reply-context");

    // The first .cn-reply-context on the page is the with-avatar demo
    const banner = page.locator(".cn-reply-context").first();
    await expect(banner).toBeVisible();

    const avatar = banner.locator(".cn-avatar");
    await expect(avatar).toBeVisible();
  });
});

// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Clicking close triggers dismiss event
test.describe("CnReplyContext — interactive dismiss", () => {
  test("clicking the dismiss button hides the banner (parent removes it)", async ({ page }) => {
    await page.goto("/components/cn-reply-context");

    // The interactive demo is the CnReplyContextDemo — it removes the banner on dismiss
    const demo = page.locator(".cn-reply-context-demo").first();
    await expect(demo).toBeVisible();

    const banner = demo.locator(".cn-reply-context");
    await expect(banner).toBeVisible();

    const dismissButton = banner.locator(".cn-reply-context__dismiss");
    await dismissButton.click();

    // After click the banner should be gone and the dismissed state message shown
    await expect(banner).not.toBeVisible();
    await expect(demo.locator("text=Reply context dismissed.")).toBeVisible();
  });

  test("dismiss log records the event after clicking dismiss", async ({ page }) => {
    await page.goto("/components/cn-reply-context");

    const demo = page.locator(".cn-reply-context-demo").first();
    const dismissButton = demo.locator(".cn-reply-context__dismiss");
    await dismissButton.click();

    const logSummary = demo.locator("details summary");
    await logSummary.click();
    const logEntry = demo.locator(".cn-reply-context-demo__log li");
    await expect(logEntry.first()).toBeVisible();
  });
});
