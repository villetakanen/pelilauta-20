import { expect, loginAs, test } from "./fixtures/auth";

/**
 * Auth: sign-out from /settings returns the user to an anonymous SSR paint.
 *
 * Spec: specs/pelilauta/session/spec.md §Testing Scenarios
 *   "Logout returns the user to an anonymous SSR paint"
 *   "Seeded session enables authenticated E2E flows"
 *
 * Asserts session-cookie deletion and zero Firebase bundle on the resulting
 * anonymous paint.
 */
test("Sign-out session delete returns anonymous SSR paint", async ({ page }) => {
  await loginAs(page, { uid: "e2e-test-user-1" });

  await page.goto("/settings");
  const logoutStatus = await page.evaluate(async () => {
    const response = await fetch("/api/auth/session", { method: "DELETE" });
    return response.status;
  });
  expect(logoutStatus).toBe(204);

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=\/settings$/);
  await page.waitForLoadState("load");

  const firebaseChunks = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .filter((name) => /firebase\/(app|auth|firestore)/.test(name)),
  );
  expect(firebaseChunks).toEqual([]);
});
