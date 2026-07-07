import { expect, test } from "./fixtures/auth";

/**
 * Session: authenticated SSR mounts the correct chrome.
 *
 * Spec: specs/pelilauta/session/spec.md §Testing Scenarios
 *   "Authenticated page mounts AuthHandler"
 *   "Seeded session enables authenticated E2E flows"
 *
 * Complements session-anonymous.spec.ts: where that spec asserts zero CSR for
 * anonymous visitors, this spec asserts the authenticated shell is present when
 * SSR resolves an active session.
 */

test("Scenario: Authenticated SSR mounts AuthHandler and ProfileButton", async ({
  signedInPage,
}) => {
  // Assert on the SSR response directly. This test covers the server-side
  // contract only (§Regression Guardrails: AuthHandler mounts only when SSR
  // says active).
  const response = await signedInPage.goto("/");
  expect(response?.status()).toBe(200);
  const html = (await response?.text()) ?? "";

  // Exactly one AuthHandler island in the SSR output.
  // When imported from a barrel, component-url may point at index.ts while
  // component-export carries the actual component id.
  const matches =
    html.match(
      /astro-island[^>]*(component-url="[^"]*AuthHandler|component-export="AuthHandler")/g,
    ) ?? [];
  expect(matches.length).toBe(1);

  // ProfileButton renders as an <a href="/settings"> in the authenticated shell.
  expect(html).toMatch(/href="\/settings"/);
});

test("Scenario: Seeded e2e session is fully functional after hydration", async ({
  signedInPage,
}) => {
  // Verifies: specs/pelilauta/session/state-machine.md §Seeded e2e session is fully functional after hydration
  //
  // The fixture plants only the server cookie; the client SDK starts signed
  // out. AuthHandler must recover the client session via /api/auth/custom-token
  // rather than tearing the session down. Observable contract: the recovery
  // round-trip happens, no logout-reload occurs, and the authenticated chrome
  // survives reconciliation.
  const recovery = signedInPage.waitForResponse(
    (r) => r.url().includes("/api/auth/custom-token") && r.status() === 200,
  );
  await signedInPage.goto("/");
  await recovery;

  // A teardown would DELETE the session and reload into the anonymous shell.
  // After recovery has completed, the authenticated chrome must still be there.
  await expect(signedInPage.locator('a[href="/settings"]').first()).toBeVisible();
  const status = await signedInPage.request.get("/api/auth/status");
  expect((await status.json()).loggedIn).toBe(true);
});
