import { test as base, type Page } from "@playwright/test";

/**
 * Shared Playwright auth fixture.
 *
 * loginAs: plants a real session cookie via the dev-only seed route
 * (/api/test/seed-session) so tests start with an authenticated session
 * without going through a real OAuth flow.
 *
 * signedInPage: fixture that calls loginAs with the canonical E2E test user
 * before handing the page to the test body.
 *
 * Requires SECRET_e2e_seed_secret to be set in the environment.
 * See specs/pelilauta/session/spec.md §Test-only seed route.
 */

const BASE_URL = "http://localhost:4321";

export async function loginAs(
  page: Page,
  { uid, claims = {} }: { uid: string; claims?: Record<string, unknown> },
): Promise<void> {
  const secret = process.env.SECRET_e2e_seed_secret;
  if (!secret) {
    throw new Error(
      "E2E fixture requires SECRET_e2e_seed_secret to be set; add it to .env.development",
    );
  }

  const response = await page.request.post(`${BASE_URL}/api/test/seed-session`, {
    headers: { "x-e2e-seed-secret": secret, "content-type": "application/json" },
    data: { uid, claims },
  });
  if (!response.ok()) {
    throw new Error(`seed-session failed: ${response.status()} ${await response.text()}`);
  }

  // Extract the session cookie from the response's Set-Cookie header and plant
  // it in the browser context so the next page.goto sends it automatically.
  const setCookie = response.headers()["set-cookie"];
  if (!setCookie) throw new Error("seed-session response missing Set-Cookie");
  const match = /session=([^;]+)/.exec(setCookie);
  if (!match) throw new Error("seed-session Set-Cookie missing session=");

  const url = new URL(BASE_URL);
  await page.context().addCookies([
    {
      name: "session",
      value: match[1],
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}

export const test = base.extend<{ signedInPage: Page }>({
  signedInPage: async ({ page }, use) => {
    await loginAs(page, { uid: "e2e-test-user-1", claims: { nick: "TestUser" } });
    await use(page);
  },
});

export { expect } from "@playwright/test";
