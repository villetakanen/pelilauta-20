import { expect, test } from "@playwright/test";

/**
 * Session: anonymous surfaces ship zero CSR for auth.
 *
 * Spec: specs/pelilauta/session/spec.md §Testing Scenarios
 *   "Anonymous page ships no Firebase client bundle"
 * and §Regression Guardrails — "Anonymous surfaces ship zero CSR for auth"
 * (no session store, no AuthHandler, no AuthChrome, no Firebase client SDK).
 *
 * Still skipped pending a stable dev-server harness. When unskipped, the
 * watcher asserts none of the forbidden chunks load during an anonymous nav.
 */
test.skip("Anonymous page ships no Firebase client bundle", async ({ page }) => {
  const forbidden: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/firebase\/(app|auth|firestore)/.test(url)) forbidden.push(url);
    if (/stores\/session|AuthChrome|AuthHandler/.test(url)) forbidden.push(url);
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(forbidden).toEqual([]);
  const handlerMarker = await page.locator("[data-auth-handler]").count();
  expect(handlerMarker).toBe(0);
});
