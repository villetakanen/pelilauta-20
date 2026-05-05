// Tests for the tags i18n surface.
//
// Verifies: specs/pelilauta/tags/i18n/spec.md §Supertag displayName resolves in both locales
// Verifies: specs/pelilauta/tags/i18n/spec.md §L&L's Finnish-brand label persists across locales
// Verifies: specs/pelilauta/tags/i18n/spec.md §Supertag description present in fi
// Verifies: specs/pelilauta/tags/i18n/spec.md §Supertag description absent in en at MVP
// Verifies: specs/pelilauta/tags/i18n/spec.md §Plain (unregistered) tag has no i18n entry
//
// Tests inspect the data trees directly without requiring the host's t()
// engine — the data shape itself is what the spec contracts.

import { describe, expect, it } from "vitest";
import { en, fi } from "./index";

describe("tags i18n — fi tree", () => {
  it("has a supertag sub-tree at the top level", () => {
    expect(fi.supertag).toBeDefined();
    expect(typeof fi.supertag).toBe("object");
  });

  it("pathfinder displayName is 'Pathfinder' in fi", () => {
    const entry = (fi.supertag as Record<string, Record<string, string>>).pathfinder;
    expect(entry?.displayName).toBe("Pathfinder");
  });

  it("L&L displayName is 'Legendoja & lohikäärmeitä' in fi", () => {
    const entry = (fi.supertag as Record<string, Record<string, string>>)[
      "legendoja %26 lohikäärmeitä"
    ];
    expect(entry?.displayName).toBe("Legendoja & lohikäärmeitä");
  });

  it("d%26d description is present in fi", () => {
    const entry = (fi.supertag as Record<string, Record<string, string>>)["d%26d"];
    expect(entry?.description).toBe("Dungeons & Dragons keskustelut, kampanjat ja materiaalit");
  });

  it("all 5 supertags have displayName in fi", () => {
    const supertag = fi.supertag as Record<string, Record<string, string>>;
    const slugs = ["d%26d", "pathfinder", "legendoja %26 lohikäärmeitä", "pbta", "call+of+cthulhu"];
    for (const slug of slugs) {
      expect(supertag[slug]?.displayName, `fi displayName missing for ${slug}`).toBeTruthy();
    }
  });

  it("all 5 supertags have description in fi", () => {
    const supertag = fi.supertag as Record<string, Record<string, string>>;
    const slugs = ["d%26d", "pathfinder", "legendoja %26 lohikäärmeitä", "pbta", "call+of+cthulhu"];
    for (const slug of slugs) {
      expect(supertag[slug]?.description, `fi description missing for ${slug}`).toBeTruthy();
    }
  });

  it("does not have an entry for an unregistered plain tag", () => {
    const supertag = fi.supertag as Record<string, unknown>;
    expect(supertag["made-up-game-name"]).toBeUndefined();
  });
});

describe("tags i18n — en tree", () => {
  it("has a supertag sub-tree at the top level", () => {
    expect(en.supertag).toBeDefined();
    expect(typeof en.supertag).toBe("object");
  });

  it("pathfinder displayName is 'Pathfinder' in en", () => {
    const entry = (en.supertag as Record<string, Record<string, string>>).pathfinder;
    expect(entry?.displayName).toBe("Pathfinder");
  });

  it("L&L displayName is 'Legendoja & lohikäärmeitä' in en (Finnish brand verbatim)", () => {
    const entry = (en.supertag as Record<string, Record<string, string>>)[
      "legendoja %26 lohikäärmeitä"
    ];
    expect(entry?.displayName).toBe("Legendoja & lohikäärmeitä");
  });

  it("d%26d description is ABSENT in en at MVP (deferred)", () => {
    const entry = (en.supertag as Record<string, Record<string, string | undefined>>)["d%26d"];
    // description key must not be present for any supertag in en at MVP
    expect(entry?.description).toBeUndefined();
  });

  it("all 5 supertags have displayName in en", () => {
    const supertag = en.supertag as Record<string, Record<string, string>>;
    const slugs = ["d%26d", "pathfinder", "legendoja %26 lohikäärmeitä", "pbta", "call+of+cthulhu"];
    for (const slug of slugs) {
      expect(supertag[slug]?.displayName, `en displayName missing for ${slug}`).toBeTruthy();
    }
  });

  it("no supertag has description in en at MVP", () => {
    const supertag = en.supertag as Record<string, Record<string, unknown>>;
    const slugs = ["d%26d", "pathfinder", "legendoja %26 lohikäärmeitä", "pbta", "call+of+cthulhu"];
    for (const slug of slugs) {
      expect(supertag[slug]?.description, `unexpected en description for ${slug}`).toBeUndefined();
    }
  });

  it("does not have an entry for an unregistered plain tag", () => {
    const supertag = en.supertag as Record<string, unknown>;
    expect(supertag["made-up-game-name"]).toBeUndefined();
  });
});
