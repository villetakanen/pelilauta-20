import { expect, test } from "@playwright/test";

/**
 * Session: anonymous surfaces ship zero CSR for auth.
 *
 * Spec: specs/pelilauta/session/spec.md §Testing Scenarios
 *   "Anonymous page ships no Firebase client bundle"
 *
 * TODO: implement the bundle-watcher. Intercept network requests during an
 * anonymous navigation to `/` and assert no `firebase/app`, `firebase/auth`,
 * or `firebase/firestore` chunk is fetched, and no AuthHandler island marker
 * is present in the DOM. This guardrail is load-bearing for SEO/perf.
 */
test.skip("Anonymous page ships no Firebase client bundle", async ({ page }) => {
  await page.goto("/");
  const firebaseRequests: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/firebase\/(app|auth|firestore)/.test(url)) {
      firebaseRequests.push(url);
    }
  });
  await page.waitForLoadState("networkidle");
  expect(firebaseRequests).toEqual([]);
  const handlerMarker = await page.locator("[data-auth-handler]").count();
  expect(handlerMarker).toBe(0);
});
