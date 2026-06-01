// E2E: Thread Detail page — specs/pelilauta/threads/spec.md
//
// Exercises the /threads/[threadKey] route for anonymous users.
// Thread data comes from the dev Firebase project — the exact threads available
// are not fixed; tests that require a real thread discover one via the front
// page and skip when the dev database is empty.
//
// Verifies: specs/pelilauta/threads/detail-page/spec.md §Anonymous thread page renders the reader container with two columns
// Verifies: specs/pelilauta/threads/detail-page/spec.md §Error and not-found states render outside the reader container
// Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Metadata block renders date, author, and channel link
// Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Host page wires the sidebar slot
// Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §SSR produces no client-side JS for the metadata block

import { expect, test } from "@playwright/test";

// Heading is localised via t("threads:title"); default locale is `fi`
// ("Keskustelut"), but match both so the test survives a locale flip.
const threadsRegion = (page: import("@playwright/test").Page) =>
  page
    .locator("section.cn-content-triad div")
    .filter({ has: page.getByRole("heading", { name: /Threads|Keskustelut/i, level: 2 }) });

test.describe("Thread Detail", () => {
  test("front-page → detail navigation renders title + body", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    await expect(region).toBeVisible();

    const cards = region.locator("article.cn-card");
    const count = await cards.count();

    if (count === 0) {
      test.skip(count === 0, "No threads in dev database — skip detail navigation test");
    }

    // Find the first card that has a link starting with /threads/
    let threadLink: import("@playwright/test").Locator | null = null;
    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a[href^='/threads/']").first();
      if ((await link.count()) > 0) {
        threadLink = link;
        break;
      }
    }

    if (!threadLink) {
      test.skip(true, "No /threads/ links found in thread cards — skip detail navigation test");
      return;
    }

    await threadLink.click();

    // URL should match /threads/{some-key}
    await expect(page).toHaveURL(/\/threads\/[^/]+/);

    // Page should have returned 200 — check that the h1 is visible as proxy
    // (Playwright does not expose the HTTP status of a navigation triggered by
    // click, but a 404 would not render a content h1)
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    // Body should contain rendered HTML — at least one paragraph or inline
    // element proving markdown was converted upstream of the component.
    // Scope to the top-level thread article (lang="fi"); the page may now
    // also contain reply articles which have their own structure.
    const article = page.locator('article[lang="fi"]').first();
    await expect(article).not.toBeEmpty();
    const hasRenderedContent = await article.locator("p, strong, em").count();
    expect(hasRenderedContent).toBeGreaterThan(0);
  });

  test("renders <meta name=description> derived from thread markdown", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    await expect(region).toBeVisible();

    const cards = region.locator("article.cn-card");
    const count = await cards.count();
    if (count === 0) test.skip(count === 0, "No threads in dev database");

    // Find first /threads/ link
    let threadLink: import("@playwright/test").Locator | null = null;
    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a[href^='/threads/']").first();
      if ((await link.count()) > 0) {
        threadLink = link;
        break;
      }
    }
    if (!threadLink) {
      test.skip(true, "No /threads/ link found");
      return;
    }

    await threadLink.click();
    await expect(page).toHaveURL(/\/threads\/[^/]+/);

    const description = await page
      .locator('head > meta[name="description"]')
      .getAttribute("content");
    expect(description).toBeTruthy();
    const desc = description ?? "";
    expect(desc.length).toBeLessThanOrEqual(160);
    // No markdown syntax characters
    expect(desc).not.toMatch(/[#*_[\]`]/);
    // No HTML tags
    expect(desc).not.toMatch(/<[^>]+>/);
  });

  test("missing thread key returns 404", async ({ page }) => {
    const randomSuffix = Date.now();
    const response = await page.goto(`/threads/this-thread-does-not-exist-${randomSuffix}`);
    expect(response?.status()).toBe(404);
  });

  test("renders the cn-content-golden reader container with two direct children", async ({
    page,
  }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    await expect(region).toBeVisible();

    const cards = region.locator("article.cn-card");
    const count = await cards.count();
    if (count === 0) test.skip(count === 0, "No threads in dev database");

    let href: string | null = null;
    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a[href^='/threads/']").first();
      if ((await link.count()) > 0) {
        href = await link.getAttribute("href");
        if (href) break;
      }
    }
    if (!href) {
      test.skip(true, "No /threads/ link found");
      return;
    }

    const response = await page.goto(href);
    expect(response?.status()).toBe(200);

    // Exactly one reader container.
    const golden = page.locator(".cn-content-golden");
    await expect(golden).toHaveCount(1);

    // Two direct element children: main (<ThreadDetail> emits <article>) and sidebar slot (<aside>).
    const directChildren = golden.locator("> *");
    await expect(directChildren).toHaveCount(2);

    // First child contains the thread article with the h1 title.
    await expect(directChildren.nth(0).locator("h1")).toBeVisible();

    // Second child is the sidebar slot — an empty <aside> for now.
    await expect(directChildren.nth(1)).toHaveJSProperty("tagName", "ASIDE");

    // No reply UI inside the reader container — reply region is a sibling.
    await expect(golden.locator("astro-island")).toHaveCount(0);
  });

  test("404 page renders no cn-content-golden", async ({ page }) => {
    const randomSuffix = Date.now();
    const response = await page.goto(`/threads/this-thread-does-not-exist-${randomSuffix}`);
    expect(response?.status()).toBe(404);
    await expect(page.locator(".cn-content-golden")).toHaveCount(0);
  });

  // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Metadata block renders date, author, and channel link
  // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Host page wires the sidebar slot
  test("sidebar aside contains ThreadMetadata with date, author link, and channel link", async ({
    page,
  }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    await expect(region).toBeVisible();

    const cards = region.locator("article.cn-card");
    const count = await cards.count();
    if (count === 0)
      test.skip(count === 0, "No threads in dev database — skip sidebar metadata test");

    let href: string | null = null;
    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a[href^='/threads/']").first();
      if ((await link.count()) > 0) {
        href = await link.getAttribute("href");
        if (href) break;
      }
    }
    if (!href) {
      test.skip(true, "No /threads/ link found");
      return;
    }

    await page.goto(href);
    await expect(page).toHaveURL(/\/threads\/[^/]+/);

    const golden = page.locator(".cn-content-golden");
    await expect(golden).toHaveCount(1);

    // The sidebar slot is the second direct child, an <aside>.
    const aside = golden.locator("> aside");
    await expect(aside).toHaveCount(1);

    // The aside contains an <address> element (ThreadMetadata's root element).
    const address = aside.locator("address");
    await expect(address).toHaveCount(1);

    // Date: a <time> element with a datetime attribute.
    const timeEl = address.locator("time");
    await expect(timeEl).toHaveCount(1);
    const datetime = await timeEl.getAttribute("datetime");
    expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Author: either an anchor to /profiles/ or a <span> for anonymous fallback.
    const profileAnchorCount = await address.locator("a[href^='/profiles/']").count();
    const anonSpanCount = await address.locator("span").count();
    expect(profileAnchorCount + anonSpanCount).toBeGreaterThan(0);

    // Channel: an anchor to /channels/.
    const channelAnchor = address.locator("a[href^='/channels/']");
    await expect(channelAnchor).toHaveCount(1);
    const channelText = await channelAnchor.innerText();
    expect(channelText.trim().length).toBeGreaterThan(0);

    // No cn-card element inside the golden reader container sidebar.
    await expect(aside.locator(".cn-card")).toHaveCount(0);
  });

  // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §SSR produces no client-side JS for the metadata block
  test("sidebar metadata block contains no astro-island (pure SSR)", async ({ page }) => {
    await page.goto("/");
    const region = threadsRegion(page);
    await expect(region).toBeVisible();

    const cards = region.locator("article.cn-card");
    const count = await cards.count();
    if (count === 0) test.skip(count === 0, "No threads in dev database — skip SSR purity test");

    let href: string | null = null;
    for (let i = 0; i < count; i++) {
      const link = cards.nth(i).locator("a[href^='/threads/']").first();
      if ((await link.count()) > 0) {
        href = await link.getAttribute("href");
        if (href) break;
      }
    }
    if (!href) {
      test.skip(true, "No /threads/ link found");
      return;
    }

    await page.goto(href);
    await expect(page).toHaveURL(/\/threads\/[^/]+/);

    const aside = page.locator(".cn-content-golden > aside");
    await expect(aside).toHaveCount(1);

    // No astro-island inside the sidebar — ThreadMetadata is pure SSR.
    await expect(aside.locator("astro-island")).toHaveCount(0);
  });
});
