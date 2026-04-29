import { expect, test } from "@playwright/test";

test.describe("AppFooter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/app-footer");
  });

  test("renders semantic footer with body and credits", async ({ page }) => {
    const footer = page.locator("main .cn-app-footer").first();
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("heading", { name: "Documentation" })).toBeVisible();
    await expect(footer.getByText("Cyan DS footer credits example.")).toBeVisible();
  });

  test("body-only example omits credits block", async ({ page }) => {
    const footer = page.locator("main .cn-app-footer").nth(1);
    await expect(footer).toBeVisible();
    await expect(footer.locator(".cn-app-footer-body")).toBeVisible();
    await expect(footer.locator(".cn-app-footer-credits")).toHaveCount(0);
  });
});
