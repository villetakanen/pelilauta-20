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
  // says active). Client-side AuthHandler reconciliation behavior is covered
  // by unit tests; it isn't reachable via cookie-plant because the fixture
  // doesn't sign into the Firebase client SDK.
  const response = await signedInPage.goto("/");
  expect(response?.status()).toBe(200);
  const html = (await response?.text()) ?? "";

  // Exactly one AuthHandler island in the SSR output.
  const matches = html.match(/astro-island[^>]*component-url="[^"]*AuthHandler/g) ?? [];
  expect(matches.length).toBe(1);

  // ProfileButton renders as an <a href="/settings"> in the authenticated shell.
  expect(html).toMatch(/href="\/settings"/);
});
