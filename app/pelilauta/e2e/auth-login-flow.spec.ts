import { expect, loginAs, test } from "./fixtures/auth";

/**
 * Auth: authenticated session flows via the seed fixture.
 *
 * Spec: specs/pelilauta/session/spec.md §Testing Scenarios
 *   "Seeded session enables authenticated E2E flows"
 *
 * Two scenarios:
 *   1. Seeded user sees authenticated chrome on the front page.
 *   2. Authenticated visitor is redirected away from /login.
 */

test("Scenario: Seeded user sees authenticated chrome on front page", async ({ signedInPage }) => {
  // Assert on the SSR response directly (pre-hydration). The cookie-plant
  // fixture proves the SERVER sees the user as authenticated; AuthHandler's
  // client-side reconcile behavior (which logs out when the Firebase client
  // has no matching user) is orthogonal to the SSR contract this test guards.
  const response = await signedInPage.goto("/");
  expect(response?.status()).toBe(200);
  const html = (await response?.text()) ?? "";

  // AuthHandler island markup is rendered by SSR when Astro.locals.uid is set.
  expect(html).toMatch(/astro-island[^>]*component-url="[^"]*AuthHandler/);

  // ProfileButton links to /settings in authenticated state.
  expect(html).toMatch(/href="\/settings"/);
});

test("Scenario: Authenticated visitor is redirected from /login", async ({ page }) => {
  await loginAs(page, { uid: "e2e-test-user-1" });

  await page.goto("/login?next=/threads");
  await page.waitForLoadState("load");

  // The login page redirects authenticated visitors to the `next` param.
  expect(page.url()).toContain("/threads");
});
