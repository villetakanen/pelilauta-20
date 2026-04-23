import { expect, test } from "@playwright/test";

/**
 * Auth: /settings is authenticated-only.
 *
 * Spec: specs/pelilauta/auth/spec.md §Testing Scenarios
 *   "/settings redirects anonymous visitors to /login"
 *
 * Locks the wire-up between the page frontmatter and `redirectIfAnonymous`
 * that the Vitest unit test cannot reach without an SSR harness.
 */
test("anonymous visitor on /settings is redirected to /login?next=/settings", async ({ page }) => {
  const response = await page.goto("/settings");

  // Astro follows the 302 by default; assert the landing URL is /login with
  // the preserved `next` param rather than inspecting the redirect response.
  expect(response?.status()).toBe(200);
  // The browser may or may not percent-encode the slash in the query value;
  // both /login?next=/settings and /login?next=%2Fsettings are valid.
  expect(page.url()).toMatch(/\/login\?next=(%2F|\/)settings$/);
});
