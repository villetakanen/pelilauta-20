import { expect, test } from "@playwright/test";

/**
 * cn-loader.spec.ts
 * E2E tests for the CnLoader component.
 *
 * Spec: specs/cyan-ds/components/cn-loader/spec.md
 */

test.describe("CnLoader Component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/cn-loader");
  });

  test("page loads with CnLoader documentation", async ({ page }) => {
    await expect(page.locator("h1")).toHaveText("CnLoader");
  });

  test("default render has status role, accessible name, ring, and icon", async ({ page }) => {
    const loader = page.locator(".cn-loader").first();
    await expect(loader).toBeVisible();
    await expect(loader).toHaveAttribute("role", "status");
    await expect(loader).toHaveAttribute("aria-label", "Loading");
    await expect(loader.locator(".lds-dual-ring")).toBeVisible();
    await expect(loader.locator(".cn-icon")).toBeVisible();
    await expect(loader.locator(".cn-icon")).toHaveAttribute("data-noun", "fox");
  });

  test("icon fits inside the loader ring with visible clearance", async ({ page }) => {
    const loader = page.locator(".cn-loader").first();
    const icon = loader.locator(".cn-icon");

    const loaderBox = await loader.boundingBox();
    const iconBox = await icon.boundingBox();
    expect(loaderBox).not.toBeNull();
    expect(iconBox).not.toBeNull();
    if (!loaderBox || !iconBox) throw new Error("Bounding boxes required");

    expect(iconBox.width).toBeLessThan(loaderBox.width);
    expect(iconBox.height).toBeLessThan(loaderBox.height);
  });

  test("inline variant renders at --cn-line (24px) square", async ({ page }) => {
    const inlineLoader = page.locator(".cn-loader-inline").first();
    await expect(inlineLoader).toBeVisible();

    const box = await inlineLoader.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error("Bounding box required");
    expect(box.width).toBe(24);
    expect(box.height).toBe(24);

    const icon = inlineLoader.locator(".cn-icon");
    const iconBox = await icon.boundingBox();
    expect(iconBox).not.toBeNull();
    if (!iconBox) throw new Error("Bounding box required");
    expect(iconBox.width).toBeLessThan(box.width);
  });

  test("noun and label props forward to markup", async ({ page }) => {
    const catLoader = page.locator('.cn-loader[aria-label="Loading feline data\u2026"]');
    await expect(catLoader).toBeVisible();
    await expect(catLoader.locator(".cn-icon")).toHaveAttribute("data-noun", "cat");
  });

  test("auto-centre rule horizontally centres the loader in a section", async ({ page }) => {
    const section = page.locator("section").filter({ has: page.locator(".cn-loader") });
    const loader = section.locator(".cn-loader");

    const sectionBox = await section.boundingBox();
    const loaderBox = await loader.boundingBox();
    expect(sectionBox).not.toBeNull();
    expect(loaderBox).not.toBeNull();
    if (!sectionBox || !loaderBox) throw new Error("Bounding boxes required");

    const expectedCenterX = sectionBox.x + sectionBox.width / 2;
    const actualCenterX = loaderBox.x + loaderBox.width / 2;
    expect(Math.abs(expectedCenterX - actualCenterX)).toBeLessThan(1);
  });

  test("auto-centre rule applies inside a CnCard actions slot", async ({ page }) => {
    const card = page.locator("article.cn-card").filter({ has: page.locator(".cn-loader") });
    const actions = card.locator("nav.actions");
    const loader = actions.locator(".cn-loader");

    await expect(loader).toBeVisible();

    const actionsBox = await actions.boundingBox();
    const loaderBox = await loader.boundingBox();
    expect(actionsBox).not.toBeNull();
    expect(loaderBox).not.toBeNull();
    if (!actionsBox || !loaderBox) throw new Error("Bounding boxes required");

    const expectedCenterX = actionsBox.x + actionsBox.width / 2;
    const actualCenterX = loaderBox.x + loaderBox.width / 2;
    expect(Math.abs(expectedCenterX - actualCenterX)).toBeLessThan(1);
  });

  test("reduced-motion media query disables ring rotation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/components/cn-loader");

    const animationName = await page.evaluate(() => {
      const el = document.querySelector(".lds-dual-ring");
      if (!el) return null;
      return window.getComputedStyle(el, "::after").animationName;
    });

    expect(animationName).toBe("none");
  });
});
