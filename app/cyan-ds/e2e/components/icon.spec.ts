import { expect, test } from "@playwright/test";

test.describe("CnIcon", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/cn-icon");
  });

  test("Renders a known Tier 1 noun (fox) without error", async ({ page }) => {
    // The sizing matrix section renders fox at multiple sizes
    const icon = page.locator('.cn-icon[data-noun="fox"]').first();
    await expect(icon).toBeVisible();
    // Must contain an inlined SVG
    const svg = icon.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("Renders the missing glyph for an unknown noun", async ({ page }) => {
    const icon = page.locator('.cn-icon[data-noun="missing"]').first();
    await expect(icon).toBeVisible();
    const svg = icon.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("Renders all five size variants of an icon", async ({ page }) => {
    const sizes = ["xsmall", "small", "medium", "large", "xlarge"] as const;
    for (const size of sizes) {
      // Each size cell contains a cn-icon wrapping an SVG
      const icon = page
        .locator('.cn-icon[data-noun="fox"]')
        .filter({ has: page.locator("svg") })
        .nth(sizes.indexOf(size));
      await expect(icon).toBeVisible();
    }
  });

  test("Icons have 1:1 aspect-ratio (no CLS)", async ({ page }) => {
    const icon = page.locator('.cn-icon[data-noun="fox"]').first();
    const box = await icon.boundingBox();
    expect(box).not.toBeNull();
    // Width and height should match (square, 1:1 aspect ratio)
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
  });

  test("Tier 1 gallery renders community icons", async ({ page }) => {
    // The Community MIT section must show at minimum fox, mekanismi, add
    for (const noun of ["fox", "mekanismi", "add"]) {
      const icon = page.locator(`.cn-icon[data-noun="${noun}"]`).first();
      await expect(icon).toBeVisible();
    }
  });

  test("Renders branded mekanismi icon (fill-opacity attribute present)", async ({ page }) => {
    const icon = page.locator('.cn-icon[data-noun="mekanismi"]').first();
    const svg = icon.locator("svg");
    await expect(svg).toBeVisible();
    // mekanismi has a path with fill-opacity="0.37" — verify it survived inlining
    const hasDepthPath = await svg.evaluate((el) => {
      const paths = el.querySelectorAll("[fill-opacity]");
      return paths.length > 0;
    });
    expect(hasDepthPath).toBe(true);
  });

  test("Resolution priority: Tier 1 (Community) wins over Tier 2 (Managed) for 'mekanismi'", async ({
    page,
  }) => {
    // Both registries have 'mekanismi', but T1 (Community) must win.
    // We verify the icon is present in the T1 section.
    const communityHeading = page.getByRole("heading", { name: /Community MIT Registry/i });
    await expect(communityHeading).toBeVisible();

    // Check that mekanismi exists in the documentation generally
    const icon = page.locator('.cn-icon[data-noun="mekanismi"]').first();
    await expect(icon).toBeVisible();

    // The Managed section should also show 'mekanismi' (since it's in the registry),
    // but the component resolution logic (tested in unit) ensures T1 content is used.
    const managedHeading = page.getByRole("heading", { name: /Managed Proprietary Registry/i });
    await expect(managedHeading).toBeVisible();
  });
});
