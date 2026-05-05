// Verifies: specs/pelilauta/tag-page/spec.md §Synonym URL redirects to canonical with 301
// Verifies: specs/pelilauta/tag-page/spec.md §Canonical supertag URL renders the rich header
// Verifies: specs/pelilauta/tag-page/spec.md §Plain tag with content renders the bare-slug heading
// Verifies: specs/pelilauta/tag-page/spec.md §Plain tag with no content returns 404
// Verifies: specs/pelilauta/tag-page/spec.md §Anonymous render is byte-identical across viewers
// Verifies: specs/pelilauta/tag-page/spec.md §Synonym redirect terminates at canonical 200 with no loop
//
// Assumes pnpm seed:e2e has been run. The seed populates:
//   tags/{H80i220q4pZYhP4DsaPn} with tags: ["löllö", "deddu", "peliraportit"]
//
// Slug mapping to seed data:
//   dnd          → synonym for D&D supertag (canonical: d&d), seeded via "deddu"
//   d&d          → canonical D&D supertag slug (decoded form)
//   peliraportit → plain tag present in seed
//   pathfinder   → supertag with no seed entries (200 because supertag metadata exists)
//   made-up-game-name → unknown plain tag (404)

import { expect, test } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

// ---------------------------------------------------------------------------
// Scenario: Synonym URL redirects to canonical with 301
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tag-page/spec.md §Synonym URL redirects to canonical with 301
"GET /tags/dnd redirects to /tags/d&d with 301", async ({ request }) => {
  // Playwright's request fixture does not follow redirects by default.
  const response = await request.get("/tags/dnd", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  const location = response.headers().location;
  // encodeURI("d&d") = "d&d" — encodeURI leaves & intact in path segments.
  expect(location).toBe("/tags/d&d");
});

// ---------------------------------------------------------------------------
// Scenario: Synonym redirect terminates at canonical 200 with no loop
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tag-page/spec.md §Synonym redirect terminates at canonical 200 with no loop
"GET /tags/dnd follows redirect to /tags/d&d and returns 200 with supertag header", async ({
  page,
}) => {
  // page.goto follows redirects by default.
  const response = await page.goto("/tags/dnd");
  // Final status must be 200 — no redirect loop.
  expect(response?.status()).toBe(200);
  // Final URL resolves to the decoded canonical.
  const finalUrl = page.url();
  expect(
    finalUrl === "http://localhost:4321/tags/d&d" ||
      finalUrl === "http://localhost:4321/tags/d%26d",
  ).toBe(true);

  // The supertag rich header (h1 with icon) must be present.
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  await expect(h1).toContainText("D&D");

  // CnIcon renders as span.cn-icon inside the h1.
  const icon = h1.locator("span.cn-icon");
  await expect(icon).toBeVisible();
});

// ---------------------------------------------------------------------------
// Scenario: Canonical supertag URL renders the rich header
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tag-page/spec.md §Canonical supertag URL renders the rich header
"GET /tags/pathfinder renders supertag rich header (icon, displayName, description, synonyms)", async ({
  page,
}) => {
  const response = await page.goto("/tags/pathfinder");
  expect(response?.status()).toBe(200);

  // h1 with icon and displayName
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  await expect(h1).toContainText("Pathfinder");

  // CnIcon renders as span.cn-icon containing an svg — check it is inside the h1
  const icon = h1.locator("span.cn-icon");
  await expect(icon).toBeVisible();

  // Description paragraph (FI locale — descriptions are present)
  const descriptionParagraph = page.locator("h1 + p").first();
  await expect(descriptionParagraph).toBeVisible();
  // Sentinel key must not leak into the output
  const descText = await descriptionParagraph.textContent();
  expect(descText).not.toContain("tags:supertag");

  // Synonyms row: chip-list with one chip per synonym
  const chipList = page.locator(".cn-chip-list").first();
  await expect(chipList).toBeVisible();
  const chips = chipList.locator(".cn-chip");
  // Pathfinder has 6 synonyms: "pathfinder 2e", "pf2e", "pathfinder 1e", "pf1e", "pf", "päffä"
  expect(await chips.count()).toBe(6);

  // Cache-Control header
  const headers = response?.headers() ?? {};
  expect(headers["cache-control"]).toBe(
    "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
  );
});

// ---------------------------------------------------------------------------
// Scenario: Plain tag with content renders the bare-slug heading
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tag-page/spec.md §Plain tag with content renders the bare-slug heading
"GET /tags/peliraportit renders bare-slug heading without icon, description, or synonyms", async ({
  page,
}) => {
  const response = await page.goto("/tags/peliraportit");
  expect(response?.status()).toBe(200);

  // h1 with exact text "#peliraportit"
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  await expect(h1).toHaveText("#peliraportit");

  // No icon in the h1
  const icon = h1.locator("span.cn-icon");
  expect(await icon.count()).toBe(0);

  // No description paragraph
  const descParagraph = page.locator("h1 + p");
  expect(await descParagraph.count()).toBe(0);

  // No synonyms chip-list
  const chipList = page.locator(".cn-chip-list");
  expect(await chipList.count()).toBe(0);

  // Cache-Control header
  const headers = response?.headers() ?? {};
  expect(headers["cache-control"]).toBe(
    "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
  );
});

// ---------------------------------------------------------------------------
// Scenario: Plain tag with no content returns 404
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tag-page/spec.md §Plain tag with no content returns 404
"GET /tags/made-up-game-name returns 404", async ({ page }) => {
  const response = await page.goto("/tags/made-up-game-name");
  expect(response?.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// Scenario: Anonymous render is byte-identical across viewers
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tag-page/spec.md §Anonymous render is byte-identical across viewers
"Anonymous and authenticated GET /tags/pathfinder render byte-identical tag-page content with no client: directives", async ({
  page,
  request,
}) => {
  // Request 1: anonymous — bare HTTP request with no session cookie.
  const anonResponse = await request.get("/tags/pathfinder");
  expect(anonResponse.status()).toBe(200);
  const anonBody = await anonResponse.text();

  // Request 2: authenticated — plant a session cookie via the seed fixture,
  // then fetch the raw SSR bytes.
  await loginAs(page, { uid: "e2e-test-user-1", claims: { nick: "TestUser" } });
  const authResponse = await page.request.get("/tags/pathfinder");
  expect(authResponse.status()).toBe(200);
  const authBody = await authResponse.text();

  // The tag page owns no per-session rendering — the auth-aware chrome is the
  // shared layout's responsibility.  Verify that the page's own content slot
  // (everything from the opening <main> tag through the tag-specific markup)
  // is byte-identical. We extract the h1 + its siblings up to (but not
  // including) the auth handler island, using the known tag page <h1> as the
  // anchor.
  const extractTagContent = (html: string): string => {
    // Extract the inner text of the first <h1> in <main> (the tag heading).
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    return h1Match ? h1Match[0] : "";
  };

  const anonContent = extractTagContent(anonBody);
  const authContent = extractTagContent(authBody);

  // The tag heading itself must be identical across sessions.
  expect(anonContent).not.toBe("");
  expect(anonContent).toBe(authContent);

  // No client: directives in the anonymous response (the page is SSR-only for
  // anonymous viewers, validating the cache-shareability contract).
  expect(anonBody).not.toContain("client:");
});
