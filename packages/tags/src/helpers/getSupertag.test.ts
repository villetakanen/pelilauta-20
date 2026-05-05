// Tests for getSupertag.
//
// Verifies: specs/pelilauta/tags/spec.md §getSupertag returns the entry for a canonical slug
// Verifies: specs/pelilauta/tags/spec.md §getSupertag returns the same entry for any synonym
// Verifies: specs/pelilauta/tags/spec.md §getSupertag returns null for an unregistered slug

import { describe, expect, it } from "vitest";
import { getSupertag } from "./getSupertag";

describe("getSupertag", () => {
  it("returns the pathfinder entry for canonical slug 'pathfinder'", () => {
    const entry = getSupertag("pathfinder");
    expect(entry).not.toBeNull();
    expect(entry?.canonicalTag).toBe("pathfinder");
  });

  it("pathfinder entry has icon 'compass'", () => {
    const entry = getSupertag("pathfinder");
    expect(entry?.icon).toBe("compass");
  });

  it("pathfinder entry synonyms contain 'pf2e'", () => {
    const entry = getSupertag("pathfinder");
    expect(entry?.synonyms).toContain("pf2e");
  });

  it("pathfinder entry synonyms contain 'päffä'", () => {
    const entry = getSupertag("pathfinder");
    expect(entry?.synonyms).toContain("päffä");
  });

  it("returns the same pathfinder entry when called with synonym 'päffä'", () => {
    const byCanonical = getSupertag("pathfinder");
    const bySynonym = getSupertag("päffä");
    expect(bySynonym).toEqual(byCanonical);
  });

  it("returns the same pathfinder entry when called with synonym 'pf2e'", () => {
    const byCanonical = getSupertag("pathfinder");
    const bySynonym = getSupertag("pf2e");
    expect(bySynonym).toEqual(byCanonical);
  });

  it("returns the D&D entry for canonical slug 'd%26d'", () => {
    const entry = getSupertag("d%26d");
    expect(entry).not.toBeNull();
    expect(entry?.canonicalTag).toBe("d%26d");
    expect(entry?.icon).toBe("d20");
  });

  it("returns the D&D entry for synonym 'dnd'", () => {
    const entry = getSupertag("dnd");
    expect(entry?.canonicalTag).toBe("d%26d");
  });

  it("returns the L&L entry for its encoded canonical slug", () => {
    const entry = getSupertag("legendoja %26 lohikäärmeitä");
    expect(entry).not.toBeNull();
    expect(entry?.canonicalTag).toBe("legendoja %26 lohikäärmeitä");
    expect(entry?.icon).toBe("ll-ampersand");
  });

  it("returns the call+of+cthulhu entry for synonym 'coc'", () => {
    const entry = getSupertag("coc");
    expect(entry?.canonicalTag).toBe("call+of+cthulhu");
  });

  it("returns null for an unregistered slug", () => {
    const entry = getSupertag("made-up-game-name");
    expect(entry).toBeNull();
  });

  it("does not throw for an unregistered slug", () => {
    expect(() => getSupertag("completely-unknown")).not.toThrow();
  });
});
