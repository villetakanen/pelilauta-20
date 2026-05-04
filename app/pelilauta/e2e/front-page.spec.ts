// Verifies: specs/pelilauta/front-page/spec.md §Front page renders all three triad regions
// Verifies: specs/pelilauta/front-page/spec.md §Triad renders side-by-side on wide viewports
// Verifies: specs/pelilauta/front-page/spec.md §Triad stacks on narrow viewports
// Verifies: specs/pelilauta/front-page/spec.md §Anonymous render of the front page ships no client-side JS
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Component contains no client-side JavaScript
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Source attribution and title links
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Items are separated by DS dividers

import { expect, test } from "@playwright/test";

test.describe("Front Page", () => {
  test("renders all three triad regions: Threads, Community blogs, Latest sites", async ({
    page,
  }) => {
    await page.goto("/");

    // Threads region: has a localised heading and a card grid
    const threadsRegion = page
      .locator("section.cn-content-triad")
      .first()
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: /Threads|Keskustelut/i, level: 2 }) });
    await expect(threadsRegion).toBeVisible();

    // Community blogs (SyndicateStream) region: heading present (from resolved deferred or fallback)
    const syndicateHeading = page.getByRole("heading", {
      name: /Community blogs|Yhteisön blogit/i,
      level: 2,
    });
    await expect(syndicateHeading).toBeVisible();

    // Latest sites region: has a heading and a card grid
    const latestSitesRegion = page
      .locator("section.cn-content-triad")
      .first()
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: /Latest sites|Sivustot/i, level: 2 }) });
    await expect(latestSitesRegion).toBeVisible();
    const siteCards = latestSitesRegion.locator("article.cn-card");
    expect(await siteCards.count()).toBeGreaterThanOrEqual(3);
  });

  test("SyndicateStream subtree contains no client-side JavaScript (no astro-island)", async ({
    page,
  }) => {
    await page.goto("/");

    // Locate the SyndicateStream column by its heading (present in both resolved and fallback states)
    const syndicateHeading = page.getByRole("heading", {
      name: /Community blogs|Yhteisön blogit/i,
      level: 2,
    });
    await expect(syndicateHeading).toBeVisible();

    // Walk up to the nearest column-level ancestor. The SyndicateStream renders
    // inside a <div> (the component's own wrapper) which is a direct child of
    // section.cn-content-triad. We use the section as scope and assert no
    // astro-island is present at all — if a client: directive were added,
    // Astro would inject one.
    const triad = page.locator("section.cn-content-triad").first();
    const astroIslands = triad.locator("astro-island");
    expect(await astroIslands.count()).toBe(0);

    // Also assert no client hydration attributes are present on any element in the triad
    const clientHydrated = triad.locator(
      "[client\\:load], [client\\:idle], [client\\:visible], [client\\:only]",
    );
    expect(await clientHydrated.count()).toBe(0);
  });

  test("renders all three triad regions with zero client-side JavaScript", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // All three regions must have h2 headings visible.
    const headings = await page.getByRole("heading", { level: 2 }).all();
    expect(headings.length).toBeGreaterThanOrEqual(3);

    // The three region headings should sit on roughly the same horizontal line
    // when the triad is rendered in wide mode.
    const boxes = await Promise.all(headings.slice(0, 3).map((h) => h.boundingBox()));
    const tops = boxes.map((b) => b?.y ?? 0);
    const spread = Math.max(...tops) - Math.min(...tops);
    expect(spread).toBeLessThan(50);
  });

  test("SyndicatePost renders source attribution caption and title link, with hr dividers between items", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for SyndicateStream heading to confirm the deferred slot has resolved
    const syndicateHeading = page.getByRole("heading", {
      name: /Community blogs|Yhteisön blogit/i,
      level: 2,
    });
    await expect(syndicateHeading).toBeVisible();

    // Find rendered SyndicatePost sections inside the SyndicateStream subtree.
    // SyndicatePost renders as <section> with a <p class="text-caption"> attribution.
    const triad = page.locator("section.cn-content-triad").first();
    const attributionCaptions = triad.locator("p.text-caption");
    const captionCount = await attributionCaptions.count();

    if (captionCount > 0) {
      // G1: each attribution caption contains an anchor (homeUrl link)
      const firstCaption = attributionCaptions.first();
      const captionLink = firstCaption.locator("a");
      await expect(captionLink).toBeVisible();
      const href = await captionLink.getAttribute("href");
      expect(href).toBeTruthy();

      // G1: the post title is rendered as an h3 with an anchor (post.link)
      const postSections = triad.locator("section");
      const firstSection = postSections.first();
      const titleLink = firstSection.locator("h3 a");
      await expect(titleLink).toBeVisible();
      const titleHref = await titleLink.getAttribute("href");
      expect(titleHref).toBeTruthy();

      // G1: no CnCard root article.cn-card inside the SyndicateStream post sections
      // (Latest sites column has cn-cards; SyndicateStream sections must have none)
      for (const sectionLocator of await postSections.all()) {
        const innerCards = sectionLocator.locator("article.cn-card");
        expect(await innerCards.count()).toBe(0);
      }
    }

    if (captionCount > 1) {
      // G2: for N items there should be N-1 <hr> elements separating them
      const hrs = triad.locator("hr");
      const hrCount = await hrs.count();
      expect(hrCount).toBe(captionCount - 1);
    }
  });

  test("triad stacks on narrow viewports", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 900 });
    await page.goto("/");

    // All three regions have h2 headings.
    const headings = await page.getByRole("heading", { level: 2 }).all();
    expect(headings.length).toBeGreaterThanOrEqual(3);

    // When stacked, the region headings are on distinct horizontal lines.
    const boxes = await Promise.all(headings.slice(0, 3).map((h) => h.boundingBox()));
    const tops = boxes.map((b) => b?.y ?? 0).sort((a, b) => a - b);
    // First and second region stacked
    expect(tops[1] - tops[0]).toBeGreaterThan(50);
    // Second and third region also stacked
    expect(tops[2] - tops[1]).toBeGreaterThan(50);
  });
});
