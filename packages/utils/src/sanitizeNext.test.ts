import { describe, expect, it } from "vitest";
import { sanitizeNext } from "./sanitizeNext";

/**
 * Tests for sanitizeNext utility.
 *
 * Spec: specs/pelilauta/auth/spec.md §Testing Scenarios
 *   - Scenario: "next parameter is validated" (used at page level in login.astro)
 *   - Scenario: "LoginButton discards unsafe next values" (component inline reuse)
 */
describe("sanitizeNext", () => {
  it("returns / for null", () => {
    expect(sanitizeNext(null)).toBe("/");
  });

  it("returns / for undefined", () => {
    expect(sanitizeNext(undefined)).toBe("/");
  });

  it("returns / for empty string", () => {
    expect(sanitizeNext("")).toBe("/");
  });

  it("returns / for absolute http URL (open redirect vector)", () => {
    expect(sanitizeNext("http://evil.example.com")).toBe("/");
  });

  it("returns / for absolute https URL", () => {
    expect(sanitizeNext("https://evil.example.com/path")).toBe("/");
  });

  it("returns / for protocol-relative URL (//evil.example.com)", () => {
    expect(sanitizeNext("//evil.example.com")).toBe("/");
  });

  it("returns / for backslash-protocol-relative (/\\ ...)", () => {
    expect(sanitizeNext("/\\evil.example.com")).toBe("/");
  });

  it("allows safe same-origin relative paths", () => {
    expect(sanitizeNext("/threads")).toBe("/threads");
    expect(sanitizeNext("/")).toBe("/");
    expect(sanitizeNext("/profile/settings")).toBe("/profile/settings");
  });
});
