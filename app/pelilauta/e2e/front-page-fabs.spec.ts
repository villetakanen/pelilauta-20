/**
 * Front-page FABs visibility scenarios.
 *
 * Spec: specs/cyan-ds/layouts/app-shell/fab-tray.md
 * Spec: specs/pelilauta/session/frozen.md §Svelte 5 FAB components hide themselves if frozen
 *
 * UI gating of FABs is a progressive enhancement.
 * Server-side enforcement remains authoritative (specs/pelilauta/session/frozen.md
 * §Strict Server Enforcement).
 */

import { expect, loginAs, test } from "./fixtures/auth";

test("Scenario: Anonymous viewer sees login CTA in fab-tray", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Anonymous viewers should see a server-rendered login CTA, not the create-thread FAB.
  const loginCta = page.locator('a[href="/login?next=/create/thread"]');
  await expect(loginCta).toBeVisible();

  // The authenticated FAB (direct /create/thread link without login redirect) must not appear.
  const fabLink = page.locator('a[href="/create/thread"]');
  await expect(fabLink).toHaveCount(0);
});

test("Scenario: Authenticated SSR uses the create-thread FAB branch", async ({ signedInPage }) => {
  // Assert on SSR HTML only: seed-session plants a cookie but does not sign into
  // Firebase client SDK, so client-side hydration may reconcile to logout.
  const response = await signedInPage.goto("/");
  expect(response?.status()).toBe(200);
  const html = (await response?.text()) ?? "";

  // Authenticated branch mounts the FrontpageFabs island, not anonymous login CTA.
  expect(html).toMatch(
    /astro-island[^>]*(component-url="[^"]*FrontpageFabs|component-export="FrontpageFabs")/,
  );
  expect(html).not.toContain('href="/login?next=/create/thread"');
});

test("Scenario: FAB hidden for a frozen logged-in user", async ({ page }) => {
  await loginAs(page, { uid: "frozen-e2e-user", claims: { nick: "FrozenUser" }, frozen: true });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const fabLink = page.locator('a[href="/create/thread"]');
  await expect(fabLink).toHaveCount(0);
});
