// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Renders all 5 supertags as chips in registry order
// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Chip href uses encodeURI on the canonical
// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Chip displays localized displayName + icon
// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Widget emits no client:* directive
// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Widget renders byte-identical content across viewers

import { expect, test } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

function normalizeAstroSourceAttrs(html: string): string {
  return html
    .replace(/\sdata-astro-source-file="[^"]*"/g, "")
    .replace(/\sdata-astro-source-loc="[^"]*"/g, "");
}

// ---------------------------------------------------------------------------
// Scenario: Renders all 5 supertags as chips in registry order
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Renders all 5 supertags as chips in registry order
"GET / FeaturedTags renders exactly 5 chips in registry order with /tags/ hrefs", async ({
  page,
}) => {
  await page.goto("/");

  // The cn-chip-list inside the FeaturedTags section must contain exactly 5 chips.
  const chipList = page.locator("section .cn-chip-list").last();
  const chips = chipList.locator("a.cn-chip");
  await expect(chips).toHaveCount(5);

  // Verify registry order: D&D, Pathfinder, L&L, PbtA, CoC
  const expectedSlugs = [
    "d&d",
    "pathfinder",
    "legendoja%20&%20lohik%C3%A4%C3%A4rmeit%C3%A4",
    "pbta",
    "call%20of%20cthulhu",
  ];

  for (let i = 0; i < expectedSlugs.length; i++) {
    const chip = chips.nth(i);
    const href = await chip.getAttribute("href");
    expect(href).toBe(`/tags/${expectedSlugs[i]}`);
  }
});

// ---------------------------------------------------------------------------
// Scenario: Chip href uses encodeURI on the canonical
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Chip href uses encodeURI on the canonical
"GET / L&L chip href uses encodeURI (& literal, non-ASCII percent-encoded)", async ({ page }) => {
  await page.goto("/");

  // The L&L chip is the 3rd chip in the cn-chip-list of FeaturedTags.
  const chipList = page.locator("section .cn-chip-list").last();
  const llChip = chipList.locator("a.cn-chip").nth(2);

  const href = await llChip.getAttribute("href");
  // encodeURI("legendoja & lohikäärmeitä") = "legendoja%20&%20lohik%C3%A4%C3%A4rmeit%C3%A4"
  // & is left literal (not %26), non-ASCII ä is UTF-8 percent-encoded (%C3%A4)
  expect(href).toBe("/tags/legendoja%20&%20lohik%C3%A4%C3%A4rmeit%C3%A4");
});

// ---------------------------------------------------------------------------
// Scenario: Chip displays localized displayName + icon
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Chip displays localized displayName + icon
"GET / D&D chip contains cn-icon with data-noun=d20 and displayName text", async ({ page }) => {
  await page.goto("/");

  // D&D is the 1st chip in the FeaturedTags cn-chip-list.
  const chipList = page.locator("section .cn-chip-list").last();
  const dndChip = chipList.locator("a.cn-chip").first();

  // CnIcon renders as span.cn-icon with data-noun attribute.
  const icon = dndChip.locator("span.cn-icon");
  await expect(icon).toBeVisible();
  const dataNoun = await icon.getAttribute("data-noun");
  expect(dataNoun).toBe("d20");

  // The chip's text content includes the localized displayName.
  await expect(dndChip).toContainText("D&D");
});

// ---------------------------------------------------------------------------
// Scenario: Widget emits no client:* directive
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Widget emits no client:* directive
"GET / FeaturedTags subtree contains no client:* directive", async ({ page }) => {
  await page.goto("/");
  // Scope to the FeaturedTags <section>: matches both the outer
  // cn-content-triad section AND the inner FeaturedTags section since both
  // contain .cn-chip-list as descendant — `.last()` picks the inner one
  // (FeaturedTags) per DOM document order. Mirrors the established pattern
  // from the registry-order test above.
  const featuredSection = page.locator("section:has(.cn-chip-list)").last();
  await expect(featuredSection).toBeVisible();
  const subtreeHtml = await featuredSection.evaluate((el) => el.outerHTML);
  expect(subtreeHtml).not.toContain("client:");
});

// ---------------------------------------------------------------------------
// Scenario: Widget renders byte-identical content across viewers
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/front-page/featured-tags/spec.md §Widget renders byte-identical content across viewers
"Anonymous and authenticated GET / render byte-identical FeaturedTags chip list", async ({
  page,
}) => {
  // Anon navigation — fresh page, no session cookie.
  await page.goto("/");
  const anonSubtree = await page
    .locator("section:has(.cn-chip-list)")
    .last()
    .evaluate((el) => el.outerHTML);

  // Auth navigation — plant session cookie, then re-navigate.
  await loginAs(page, { uid: "e2e-test-user-1", claims: { nick: "TestUser" } });
  await page.goto("/");
  const authSubtree = await page
    .locator("section:has(.cn-chip-list)")
    .last()
    .evaluate((el) => el.outerHTML);

  expect(anonSubtree).not.toBe("");
  expect(normalizeAstroSourceAttrs(anonSubtree)).toBe(normalizeAstroSourceAttrs(authSubtree));
});
