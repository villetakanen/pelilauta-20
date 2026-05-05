// Tests for the supertag registry.
//
// Verifies: specs/pelilauta/tags/spec.md §Registry contains all 5 carry-forward supertags

import { describe, expect, it } from "vitest";
import { SUPERTAGS } from "./supertags";

describe("SUPERTAGS registry", () => {
  it("contains exactly 5 entries", () => {
    expect(SUPERTAGS).toHaveLength(5);
  });

  it("contains all 5 expected canonical slugs", () => {
    const canonicalTags = SUPERTAGS.map((e) => e.canonicalTag);
    expect(canonicalTags).toContain("d%26d");
    expect(canonicalTags).toContain("pathfinder");
    expect(canonicalTags).toContain("legendoja %26 lohikäärmeitä");
    expect(canonicalTags).toContain("pbta");
    expect(canonicalTags).toContain("call+of+cthulhu");
  });

  it("every entry has a non-empty synonyms array", () => {
    for (const entry of SUPERTAGS) {
      expect(entry.synonyms.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty icon noun", () => {
    for (const entry of SUPERTAGS) {
      expect(entry.icon.length).toBeGreaterThan(0);
    }
  });

  it("d%26d entry has icon 'd20'", () => {
    const dnd = SUPERTAGS.find((e) => e.canonicalTag === "d%26d");
    expect(dnd?.icon).toBe("d20");
  });

  it("pathfinder entry has icon 'compass'", () => {
    const pf = SUPERTAGS.find((e) => e.canonicalTag === "pathfinder");
    expect(pf?.icon).toBe("compass");
  });

  it("is frozen (immutable at runtime)", () => {
    expect(Object.isFrozen(SUPERTAGS)).toBe(true);
  });
});
