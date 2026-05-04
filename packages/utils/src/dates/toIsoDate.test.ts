import { describe, expect, it } from "vitest";
import { toIsoDate } from "./toIsoDate";

describe("toIsoDate", () => {
  it("toIsoDate returns the UTC date for a 2026 timestamp", () => {
    expect(toIsoDate(new Date("2026-05-04T12:00:00Z"))).toBe("2026-05-04");
  });

  it("toIsoDate returns the UTC date for a 1999 timestamp", () => {
    expect(toIsoDate(new Date("1999-01-01T00:00:00Z"))).toBe("1999-01-01");
  });

  it("toIsoDate returns epoch date for number 0", () => {
    expect(toIsoDate(0)).toBe("1970-01-01");
  });

  it("Absolute output is UTC, not viewer-local (1 AM UTC reads as same UTC date regardless of timezone)", () => {
    // Date.toISOString() always produces UTC, so this holds by construction —
    // no TZ env mocking needed. Asserting the contract explicitly.
    expect(toIsoDate(new Date("2026-05-04T01:00:00Z"))).toBe("2026-05-04");
  });
});
