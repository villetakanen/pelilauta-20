import { expect, test } from "@playwright/test";

/**
 * Auth: sign-out from /settings returns the user to an anonymous SSR paint.
 *
 * Spec: specs/pelilauta/auth/spec.md §Testing Scenarios
 *   "Sign-out from authenticated chrome" (/settings variant).
 *
 * Skipped pending a shared auth fixture that seeds a valid session cookie.
 * The same fixture is needed by `auth-login-flow.spec.ts`; unskip once that
 * lands. When unskipped, asserts the DELETE fan-out and zero Firebase bundle
 * on the resulting anonymous paint.
 */
test.skip("Sign-out from /settings triggers DELETE + anonymous SSR paint", async ({ page }) => {
  // loginAsTestUser(page, context); — pending auth fixture

  const deleteRequests: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().endsWith("/api/auth/session")) {
      deleteRequests.push(req.url());
    }
  });

  await page.goto("/settings");
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForLoadState("load");

  expect(deleteRequests).toHaveLength(1);

  const firebaseChunks = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .filter((name) => /firebase\/(app|auth|firestore)/.test(name)),
  );
  expect(firebaseChunks).toEqual([]);
});
