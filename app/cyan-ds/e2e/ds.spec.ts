import { expect, test } from "@playwright/test";

test("DS page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("article h1")).toHaveText("Cyan Design System");
});
