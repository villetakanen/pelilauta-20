import { expect, test } from "@playwright/test";

test.describe("Elevation Utilities", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/styles/elevation");
  });

  test("Elevation 1 is shadowless but has surface color", async ({ page }) => {
    const el = page.locator(".elevation-1").first();
    const style = await el.evaluate((node) => {
      const s = window.getComputedStyle(node);
      return {
        boxShadow: s.boxShadow,
        backgroundColor: s.backgroundColor,
      };
    });

    expect(style.boxShadow).toBe("none");
    // Background color should be defined (from --cn-surface-1)
    expect(style.backgroundColor).not.toBe("rgba(0,0,0,0)");
    expect(style.backgroundColor).not.toBe("transparent");
  });

  test("Elevation 2-4 have shadows", async ({ page }) => {
    for (const level of [2, 3, 4]) {
      const el = page.locator(`.elevation-${level}`).first();
      const boxShadow = await el.evaluate((node) => window.getComputedStyle(node).boxShadow);
      expect(boxShadow).not.toBe("none");
      expect(boxShadow).not.toBe("");
    }
  });

  test("Relative Elevation Engine: Nested depth reduction", async ({ page }) => {
    // Elevation 4 inside Elevation 3 should have NO shadow (0 leap)
    const nested4in3 = page.locator(".elevation-3 .elevation-4");
    const shadow4in3 = await nested4in3.evaluate((node) => window.getComputedStyle(node).boxShadow);
    expect(shadow4in3).toBe("none");

    // Elevation 4 inside Elevation 1 should have a level 3 leap shadow
    const nested4in1 = page.locator(".elevation-1 .elevation-4");
    const shadow4in1 = await nested4in1.evaluate((node) => window.getComputedStyle(node).boxShadow);
    expect(shadow4in1).not.toBe("none");

    // Check Elevation 2 inside 1 is shadowless (leap of 1)
    const nested2in1 = page.locator(".elevation-1 .elevation-2");
    const shadow2in1 = await nested2in1.evaluate((node) => window.getComputedStyle(node).boxShadow);
    expect(shadow2in1).toBe("none");
  });
});
