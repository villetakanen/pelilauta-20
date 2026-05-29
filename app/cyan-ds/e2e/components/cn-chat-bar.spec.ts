// E2E tests for CnChatBar. These cover spec scenarios that require a real CSS
// layout engine and a browser: auto-expand behaviour (field-sizing, max-height),
// scrollbar visibility, and light-dark token resolution. Structural and
// keyboard-handler coverage lives in packages/cyan/src/components/CnChatBar.test.ts.
//
// Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Textarea grows with input

import { expect, test } from "@playwright/test";

test.describe("CnChatBar — auto-expand and scroll cap", () => {
  // Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Textarea grows with input
  test("textarea height increases as content is added", async ({ page }) => {
    await page.goto("/components/cn-chat-bar");
    const textarea = page.locator(".cn-chat-bar__input").first();
    await expect(textarea).toBeVisible();

    const initialHeight = await textarea.evaluate((el) => el.getBoundingClientRect().height);

    // Type four lines of text
    await textarea.fill("line 1\nline 2\nline 3\nline 4");
    const expandedHeight = await textarea.evaluate((el) => el.getBoundingClientRect().height);

    expect(expandedHeight).toBeGreaterThan(initialHeight);
  });

  // Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Textarea grows with input
  test("textarea does not exceed 4-line max-height on desktop and shows scrollbar", async ({
    page,
  }) => {
    await page.goto("/components/cn-chat-bar");
    const textarea = page.locator(".cn-chat-bar__input").first();
    await expect(textarea).toBeVisible();

    // Type more than 4 lines
    await textarea.fill("line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8");

    const { height, lineHeight, overflow } = await textarea.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        height: el.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(cs.lineHeight),
        overflow: cs.overflowY,
      };
    });

    const maxHeightPx = lineHeight * 4;
    // Height is capped at 4 lines (allow 2px rounding)
    expect(height).toBeLessThanOrEqual(maxHeightPx + 2);
    // Scrollbar is shown when content exceeds cap
    expect(overflow === "auto" || overflow === "scroll").toBe(true);
  });
});
