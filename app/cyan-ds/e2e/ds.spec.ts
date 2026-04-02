import { expect, test } from "@playwright/test";

test("DS page loads with button variants", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Cyan Design System");
  await expect(page.locator(".button")).toHaveCount(6);
});
