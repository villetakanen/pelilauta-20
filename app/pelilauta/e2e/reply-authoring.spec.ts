// E2E: Thread Reply Authoring — specs/pelilauta/threads/replies/authoring/spec.md
//
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Anonymous viewers see a login CTA in place of the form
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
  // Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Anonymous viewers see a login CTA in place of the form
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

// --- Authenticated viewer's SSR mounts the ThreadReplySection island ---
//
// Note on assertion model: the auth fixture plants a server-side session cookie
// but does NOT sign in the Firebase client SDK. As a result, the client-side
// AuthHandler cannot fully transition `sessionState` to "active" in e2e — that
// reconciliation path is covered by unit tests instead (see
// `session-authenticated.spec.ts` for the same constraint).
//
// What this e2e can — and must — verify is that the SSR pass renders the
// ThreadReplySection island markup at all. If the wrapper component throws
// during SSR (e.g. an `import type` regression eliding the value binding), the
// astro-island element disappears from the response and the authenticated
// thread page is silently broken. That's the regression class that landed in
// production despite green unit + astro:check + build gates, and what this
// test exists to catch.

authTest.describe("Reply Authoring — authenticated viewer", () => {
  // Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Successful write returns the parsed Reply
  authTest(
    "SSR renders the ThreadReplySection island for authenticated user",
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

      // The ThreadReplySection island must be present in the SSR output for
      // authenticated viewers. Pre-fix this string was absent because the
      // wrapper threw during SSR.
      const islandMatches =
        html.match(
          /astro-island[^>]*(component-url="[^"]*ThreadReplySection|component-export="ThreadReplySection")/g,
        ) ?? [];
      expect(islandMatches.length).toBe(1);

      // Anonymous login CTA must NOT appear in authenticated SSR.
      expect(html).not.toMatch(/href="\/login\?next=/);
    },
  );
});
