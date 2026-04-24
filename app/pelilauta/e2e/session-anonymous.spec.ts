import { expect, test } from "@playwright/test";

/**
 * Session: anonymous surfaces ship zero CSR for auth.
 *
 * Spec: specs/pelilauta/session/spec.md §Testing Scenarios
 *   "Anonymous page ships no Firebase client bundle"
 * and §Regression Guardrails — "Anonymous surfaces ship zero CSR for auth"
 * (no session store, no AuthHandler, no AuthChrome, no Firebase client SDK).
 *
 * Two complementary assertions:
 *   1. Network — no request URL matches a forbidden chunk (firebase SDK,
 *      session store, or auth CSR components).
 *   2. DOM — no `<astro-island>` element references an auth CSR component.
 *      `AuthHandler` is headless (no visible UI), so the island wrapper is
 *      the only reliable signal it was mounted.
 */
test("Anonymous page ships no Firebase client bundle", async ({ page }) => {
  const forbidden: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/firebase\/(app|auth|firestore)/.test(url)) forbidden.push(url);
    if (/stores\/session|AuthChrome|AuthHandler/.test(url)) forbidden.push(url);
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(forbidden).toEqual([]);

  const authIslandCount = await page.locator('astro-island[component-url*="Auth"]').count();
  expect(authIslandCount).toBe(0);
});
