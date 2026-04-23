import { describe, expect, it } from "vitest";
import { redirectIfAnonymous } from "../utils/authenticatedPageGuard";

/**
 * settings.astro is a one-liner that forwards to `redirectIfAnonymous` — this
 * test exercises the same helper the page calls, so removing the gate from
 * the page frontmatter (or flipping the condition) is caught by the companion
 * Playwright scenario in `auth-settings-gated.spec.ts`.
 *
 * Spec: specs/pelilauta/auth/spec.md §Testing Scenarios
 *   "/settings redirects anonymous visitors to /login"
 */
describe("/settings redirect gate", () => {
  it("Scenario: /settings redirects anonymous visitors to /login", () => {
    expect(redirectIfAnonymous(null, "/settings")).toEqual({
      path: "/login?next=/settings",
      status: 302,
    });
  });

  it("treats undefined uid as anonymous", () => {
    expect(redirectIfAnonymous(undefined, "/settings")).toEqual({
      path: "/login?next=/settings",
      status: 302,
    });
  });

  it("allows authenticated visitors through (no redirect)", () => {
    expect(redirectIfAnonymous("uid-123", "/settings")).toBeNull();
  });
});
