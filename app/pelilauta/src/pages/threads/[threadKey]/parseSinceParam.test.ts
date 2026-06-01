// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Host page parses ?since= into targetFlowTime

import { describe, expect, it } from "vitest";
import { parseSinceParam } from "./parseSinceParam";

describe("parseSinceParam", () => {
  it("returns the numeric value when ?since= is a valid integer", () => {
    expect(parseSinceParam(new URL("https://example.com/?since=200"))).toBe(200);
  });

  it("returns undefined when ?since= is not a number", () => {
    expect(parseSinceParam(new URL("https://example.com/?since=not-a-number"))).toBeUndefined();
  });

  it("returns undefined when the ?since param is missing", () => {
    expect(parseSinceParam(new URL("https://example.com/"))).toBeUndefined();
  });

  it("accepts a string URL", () => {
    expect(parseSinceParam("https://example.com/?since=500")).toBe(500);
  });

  it("returns undefined for null input", () => {
    expect(parseSinceParam(null)).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(parseSinceParam(undefined)).toBeUndefined();
  });

  it("returns undefined when ?since= is an empty string", () => {
    expect(parseSinceParam(new URL("https://example.com/?since="))).toBeUndefined();
  });

  it("returns a float when ?since= is a float string", () => {
    expect(parseSinceParam(new URL("https://example.com/?since=1.5"))).toBe(1.5);
  });
});
