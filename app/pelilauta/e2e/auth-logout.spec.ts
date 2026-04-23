import { expect, loginAs, test } from "./fixtures/auth";

/**
 * Auth: sign-out from /settings returns the user to an anonymous SSR paint.
 *
 * Spec: specs/pelilauta/session/spec.md §Testing Scenarios
 *   "Logout returns the user to an anonymous SSR paint"
 *   "Seeded session enables authenticated E2E flows"
 *
 * Asserts the DELETE fan-out and zero Firebase bundle on the resulting
 * anonymous paint.
 */
test("Sign-out from /settings triggers DELETE + anonymous SSR paint", async ({ page }) => {
  await loginAs(page, { uid: "e2e-test-user-1" });

  const deleteRequests: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().endsWith("/api/auth/session")) {
      deleteRequests.push(req.url());
    }
  });

  await page.goto("/settings");

  // Wait for the DELETE request to fire before asserting — click alone
  // doesn't guarantee the async fullLogout fetch has completed. AuthHandler's
  // reconcile path can also trigger a DELETE when the seeded server session
  // has no matching Firebase client user; either path satisfies the spec
  // (sign-out → DELETE → anonymous paint).
  const deletePromise = page.waitForRequest(
    (req) => req.method() === "DELETE" && req.url().endsWith("/api/auth/session"),
    { timeout: 10000 },
  );
  await page.getByRole("button", { name: /sign out/i }).click();
  await deletePromise;
  await page.waitForLoadState("load");

  expect(deleteRequests.length).toBeGreaterThanOrEqual(1);

  const firebaseChunks = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .filter((name) => /firebase\/(app|auth|firestore)/.test(name)),
  );
  expect(firebaseChunks).toEqual([]);
});
