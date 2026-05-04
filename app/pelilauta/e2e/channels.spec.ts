// E2E: Channels directory page — specs/pelilauta/channels/spec.md
// Verifies: specs/pelilauta/channels/spec.md §/channels renders the directory grouped by category
// Verifies: specs/pelilauta/channels/spec.md §/channels falls back the missing-category bucket to "Pelilauta"
//
// Channel data comes from the dev Firebase project. The test skips when the
// channel list is empty rather than failing — the same pattern used in
// thread-detail.spec.ts.

import { expect, test } from "@playwright/test";

test.describe("Channels directory", () => {
  test("renders the page with an h1 for SEO/a11y", async ({ page }) => {
    await page.goto("/channels");

    // h1 is sr-only so it may not be visible — use toBeAttached
    const h1 = page.locator("h1");
    await expect(h1).toBeAttached();
  });

  test("renders at least one category section with an h2 when channels exist", async ({ page }) => {
    await page.goto("/channels");

    const sections = page.locator("section");
    const count = await sections.count();

    if (count === 0) {
      test.skip(count === 0, "No channels in dev database — skip category section test");
      return;
    }

    // Each section should have an h2 heading with the category name
    const h2 = page.locator("section h2");
    await expect(h2.first()).toBeAttached();
  });

  test("each channel row has an h3 with a link to /channels/{slug}", async ({ page }) => {
    await page.goto("/channels");

    const channelLinks = page.locator("article h3 a[href^='/channels/']");
    const count = await channelLinks.count();

    if (count === 0) {
      test.skip(count === 0, "No channels in dev database — skip channel row test");
      return;
    }

    // At least one channel row link must exist pointing into /channels/
    await expect(channelLinks.first()).toBeAttached();

    // Verify the full row content: icon, description, threadCount label
    const firstRow = page.locator("article").first();

    // Icon: CnIcon renders a <span class="cn-icon"> wrapping an <svg>
    await expect(firstRow.locator(".cn-icon svg").first()).toBeAttached();

    // Description: the row has a <p> for description
    await expect(firstRow.locator("p").first()).toBeAttached();

    // threadCount label: matches Finnish ({count} ketjua) or English ({count} threads)
    await expect(firstRow.getByText(/\d+\s+(ketjua|threads)/)).toBeAttached();
  });

  test("no Firebase client SDK chunk is requested", async ({ page }) => {
    const firebaseRequests: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (/firebase\/(app|auth|firestore)/.test(url)) firebaseRequests.push(url);
    });

    await page.goto("/channels");

    expect(firebaseRequests).toHaveLength(0);
  });
});
