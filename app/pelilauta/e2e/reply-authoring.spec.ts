// E2E: Thread Reply Authoring — specs/pelilauta/threads/detail-page/replies/authoring/spec.md
//
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Anonymous viewers see a login CTA in place of the form
//
// Note: The "happy path post flow" scenario (authenticated user submits a reply)
// requires a running app + a live Firestore dev database. It is structured to
// skip gracefully when no thread data is available in the dev database. The
// spec contract for the full post flow is covered by unit tests
// (ReplyForm.test.ts + postReply.test.ts + replies.test.ts).

import { expect, test } from "@playwright/test";
import { test as authTest } from "./fixtures/auth";

// ---  Anonymous viewer sees login CTA ---

test.describe("Reply Authoring — anonymous viewer", () => {
  // Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Anonymous viewers see a login CTA in place of the form
  test("shows login CTA link instead of reply form on thread page", async ({ page }) => {
    // Find a real thread key from the front page first
    await page.goto("/");
    const threadLink = page.locator("article.cn-card a[href^='/threads/']").first();
    const count = await threadLink.count();
    if (count === 0) {
      test.skip(true, "No threads in dev database — skip anonymous CTA test");
      return;
    }

    const href = await threadLink.getAttribute("href");
    if (!href) {
      test.skip(true, "Could not get thread href — skip");
      return;
    }

    await page.goto(href);
    await expect(page).toHaveURL(/\/threads\/[^/]+/);

    // Anonymous: login CTA link must be present
    const loginCta = page.locator(`a[href^="/login?next=${href}"]`);
    await expect(loginCta).toBeVisible({ timeout: 5000 });

    // ReplyForm island must NOT be present (no cn-reply-anchor aside)
    const replyAnchor = page.locator("aside.cn-reply-anchor");
    await expect(replyAnchor).toHaveCount(0);
  });

  test("anonymous view of /threads/[key] returns 200 status", async ({ page }) => {
    await page.goto("/");
    const threadLink = page.locator("article.cn-card a[href^='/threads/']").first();
    const count = await threadLink.count();
    if (count === 0) {
      test.skip(true, "No threads in dev database");
      return;
    }
    const href = await threadLink.getAttribute("href");
    if (!href) return;

    const response = await page.goto(href);
    expect(response?.status()).toBe(200);
  });
});

// Authenticated SSR must render both reply islands: ThreadReplies (inside the
// prose section) and ReplyForm (sibling after it). The auth fixture plants a
// server-side session cookie but does not sign in the Firebase client SDK, so
// `sessionState` cannot fully transition to "active" in e2e — that path is
// covered by unit tests. The SSR markup assertion catches the class of
// regression where one of the islands silently fails to render server-side.

authTest.describe("Reply Authoring — authenticated viewer", () => {
  // Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §The host mounts ThreadReplies inside cn-content-prose and ReplyForm as a sibling after that section
  authTest(
    "SSR renders ThreadReplies and ReplyForm as separate islands for authenticated user",
    async ({ signedInPage }) => {
      await signedInPage.goto("/");
      const threadLink = signedInPage.locator("article.cn-card a[href^='/threads/']").first();
      const count = await threadLink.count();
      if (count === 0) {
        authTest.skip(count === 0, "No threads in dev database");
        return;
      }

      const href = await threadLink.getAttribute("href");
      if (!href) {
        authTest.skip(true, "Could not get thread href");
        return;
      }

      const response = await signedInPage.goto(href);
      expect(response?.status()).toBe(200);
      const html = (await response?.text()) ?? "";

      const repliesIsland =
        html.match(
          /astro-island[^>]*(component-url="[^"]*ThreadReplies|component-export="ThreadReplies")/g,
        ) ?? [];
      expect(repliesIsland.length).toBe(1);

      const formIsland =
        html.match(
          /astro-island[^>]*(component-url="[^"]*ReplyForm|component-export="ReplyForm")/g,
        ) ?? [];
      expect(formIsland.length).toBe(1);

      // ReplyForm must NOT be nested inside the cn-content-prose section.
      const formInsideProse = await signedInPage
        .locator('section.cn-content-prose astro-island[component-export="ReplyForm"]')
        .count();
      expect(formInsideProse).toBe(0);

      // Anonymous login CTA must NOT appear in authenticated SSR.
      expect(html).not.toMatch(/href="\/login\?next=/);
    },
  );
});
