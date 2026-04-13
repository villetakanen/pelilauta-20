import { describe, expect, it } from "vitest";
import { toDate } from "./toDate.js";

describe("toDate", () => {
  it("returns a Date instance unchanged", () => {
    const d = new Date("2024-01-15T12:00:00Z");
    expect(toDate(d)).toBe(d);
  });

  it("parses an ISO string", () => {
    const result = toDate("2024-01-15T12:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("2024-01-15T12:00:00.000Z");
  });

  it("converts an epoch number (ms)", () => {
    expect(toDate(0)).toEqual(new Date(0));
    expect(toDate(1_000_000)).toEqual(new Date(1_000_000));
  });

  it("converts a Firestore Timestamp-shaped object", () => {
    const ts = { seconds: 1_705_320_000, nanoseconds: 500_000_000 };
    const result = toDate(ts);
    expect(result).toBeInstanceOf(Date);
    // seconds * 1000 + floor(nanoseconds / 1e6) = 1705320000000 + 500 = 1705320000500
    expect(result.getTime()).toBe(1_705_320_000_500);
  });

  it("returns epoch for null", () => {
    expect(toDate(null)).toEqual(new Date(0));
  });

  it("returns epoch for undefined", () => {
    expect(toDate(undefined)).toEqual(new Date(0));
  });

  it("returns epoch for an invalid string", () => {
    expect(toDate("not-a-date")).toEqual(new Date(0));
  });

  it("returns epoch for an unrecognized object shape", () => {
    expect(toDate({ foo: 1 } as unknown)).toEqual(new Date(0));
  });
});
