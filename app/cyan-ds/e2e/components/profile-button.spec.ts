import { expect, test } from "@playwright/test";

test.describe("ProfileButton", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the DS page where ProfileButton is demoed
    await page.goto("/components/profile-button");
  });

  test("Scenario: Loading Skeleton", async ({ page }) => {
    // Find the loading button
    const loadingBtn = page.locator(".cn-profile-button--loading").first();

    await expect(loadingBtn).toBeVisible();
    await expect(loadingBtn).toHaveAttribute("aria-hidden", "true");

    // Ensure no anchor element is present for this state
    // (the loading button itself is a div, not an 'a' tag)
    const tagName = await loadingBtn.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("div");

    const skeleton = loadingBtn.locator(".cn-profile-button__skeleton");
    await expect(skeleton).toBeVisible();
  });

  test("Scenario: Authenticated Profile State", async ({ page }) => {
    const authBtn = page.locator(".cn-profile-button--authenticated").first();

    await expect(authBtn).toBeVisible();
    await expect(authBtn).toHaveAttribute("href", "/settings");

    // Should have CnAvatar inside
    const avatar = authBtn.locator(".cn-avatar");
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute("data-nick", "CyanUser");
  });

  test("Scenario: Anonymous Login State", async ({ page }) => {
    const anonBtn = page.locator(".cn-profile-button--anonymous").first();

    await expect(anonBtn).toBeVisible();
    await expect(anonBtn).toHaveAttribute("href", "/login");

    // Should have login icon inside
    const icon = anonBtn.locator('.cn-icon[data-noun="login"]');
    await expect(icon).toBeVisible();
  });

  test("Scenario: No Layout Shift on Transition", async ({ page }) => {
    const loadingBtn = page.locator(".cn-profile-button--loading").first();
    const authBtn = page.locator(".cn-profile-button--authenticated").first();

    const loadingBox = await loadingBtn.boundingBox();
    const authBox = await authBtn.boundingBox();

    if (!loadingBox || !authBox) throw new Error("expected both buttons to have bounding boxes");

    // Should both be exactly 48x48
    expect(loadingBox.width).toBeCloseTo(48, 0);
    expect(loadingBox.height).toBeCloseTo(48, 0);
    expect(authBox.width).toBeCloseTo(48, 0);
    expect(authBox.height).toBeCloseTo(48, 0);
  });
});
