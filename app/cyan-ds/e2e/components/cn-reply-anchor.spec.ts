// E2E tests for CnReplyAnchor. These cover spec scenarios that require a real
// CSS layout engine: position computation, sticky/fixed switching by viewport
// width, and top-offset on mobile. Structural and class-toggle coverage lives
// in packages/cyan/src/components/CnReplyAnchor.test.ts.
//
// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Desktop layout is bottom-sticky
// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Mobile layout is top-fixed
// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Inline layout does not stick

import { expect, test } from "@playwright/test";

// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Desktop layout is bottom-sticky
test.describe("CnReplyAnchor — desktop layout (bottom-sticky)", () => {
  test("root element is an <aside>", async ({ page }) => {
    await page.goto("/components/cn-reply-anchor");
    const anchor = page.locator(".cn-reply-anchor").first();
    await expect(anchor).toBeVisible();

    const tagName = await anchor.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("aside");
  });

  test("fixed=true desktop variant resolves to sticky position with bottom: 0", async ({
    page,
  }) => {
    // Default viewport is desktop (>= 768px)
    await page.goto("/components/cn-reply-anchor");

    const anchor = page.locator(".cn-reply-anchor--fixed").first();
    await expect(anchor).toBeVisible();

    const { position, bottom } = await anchor.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        position: cs.position,
        bottom: cs.bottom,
      };
    });

    // Desktop: position must be sticky (or absolute — either satisfies the spec contract)
    expect(["sticky", "absolute"]).toContain(position);
    expect(bottom).toBe("0px");
  });
});

// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Inline layout does not stick
test.describe("CnReplyAnchor — inline layout (fixed=false)", () => {
  test("fixed=false variant has static position (no sticky or fixed)", async ({ page }) => {
    await page.goto("/components/cn-reply-anchor");

    // The inline demo uses fixed={false} — it has .cn-reply-anchor but NOT .cn-reply-anchor--fixed
    // Use :not() CSS selector to target it directly without non-null assertions
    const inlineAnchor = page.locator(".cn-reply-anchor:not(.cn-reply-anchor--fixed)").first();
    await expect(inlineAnchor).toBeVisible();

    const position = await inlineAnchor.evaluate((el) => window.getComputedStyle(el).position);
    expect(position).toBe("static");
  });
});

// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Mobile layout is top-fixed
test.describe("CnReplyAnchor — mobile layout (top-fixed)", () => {
  test("fixed=true at 375×667 viewport resolves to position:fixed with non-zero top", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();
    await page.goto("/components/cn-reply-anchor");

    const anchor = page.locator(".cn-reply-anchor--fixed").first();
    await expect(anchor).toBeVisible();

    const { position, top, bottom } = await anchor.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        position: cs.position,
        top: cs.top,
        bottom: cs.bottom,
      };
    });

    // Mobile: must be fixed (not sticky)
    expect(position).toBe("fixed");

    // Must NOT be bottom-pinned (keyboard safety guardrail)
    expect(bottom).not.toBe("0px");

    // top must be a non-zero value (app-bar offset)
    const topPx = parseFloat(top);
    expect(topPx).toBeGreaterThan(0);

    await context.close();
  });

  test("mobile fixed=true does NOT have bottom:0 (keyboard-safety guardrail)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();
    await page.goto("/components/cn-reply-anchor");

    const anchor = page.locator(".cn-reply-anchor--fixed").first();
    const bottom = await anchor.evaluate((el) => window.getComputedStyle(el).bottom);

    // Regression guardrail: bottom must never be 0px on mobile
    expect(bottom).not.toBe("0px");

    await context.close();
  });
});
