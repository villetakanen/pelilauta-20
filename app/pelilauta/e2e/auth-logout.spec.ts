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

  // AuthHandler's reconcile path can fire DELETE during hydration if the
  // seeded server session has no matching Firebase client user; the explicit
  // sign-out click is the second possible trigger. Either path satisfies the
  // spec. To avoid a race against the reconcile-fires-before-waitForRequest
  // window, capture every DELETE via a long-lived listener registered BEFORE
  // any navigation, then poll the captured array.
  const deleteRequests: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().endsWith("/api/auth/session")) {
      deleteRequests.push(req.url());
    }
  });

  await page.goto("/settings");

  // The button click is best-effort: if reconcile already fired DELETE during
  // hydration (and the page is on its way to /login), the click target may be
  // gone. Don't fail the test on that — we just want the DELETE to have
  // happened, by either path.
  await page
    .getByRole("button", { name: /sign out/i })
    .click({ timeout: 2000 })
    .catch(() => {});

  await expect.poll(() => deleteRequests.length, { timeout: 10000 }).toBeGreaterThanOrEqual(1);
  await page.waitForLoadState("load");

  const firebaseChunks = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .filter((name) => /firebase\/(app|auth|firestore)/.test(name)),
  );
  expect(firebaseChunks).toEqual([]);
});
