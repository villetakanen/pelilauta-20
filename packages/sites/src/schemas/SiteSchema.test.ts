// Scenarios: "Parse site from Firestore document"
//            "createSite factory produces a valid blank Site"
// — specs/pelilauta/sites/spec.md

import { describe, expect, it } from "vitest";
import { migrateLegacySiteFields } from "./migrateLegacySiteFields";
import { createSite, SiteSchema } from "./SiteSchema";

describe("SiteSchema.parse", () => {
  it("converts Firestore Timestamp-shaped dates to Date objects", () => {
    const raw = {
      key: "site-1",
      name: "My Campaign",
      owners: ["uid-1"],
      createdAt: { seconds: 1_700_000_000, nanoseconds: 0 },
      updatedAt: { seconds: 1_700_000_500, nanoseconds: 0 },
    };
    const site = SiteSchema.parse(raw);
    expect(site.createdAt).toBeInstanceOf(Date);
    expect(site.createdAt?.getTime()).toBe(1_700_000_000 * 1000);
    expect(site.updatedAt).toBeInstanceOf(Date);
  });

  it("defaults name to '[...]' when missing", () => {
    const site = SiteSchema.parse({ owners: ["uid-1"] });
    expect(site.name).toBe("[...]");
  });

  it("defaults system to 'homebrew' when missing", () => {
    const site = SiteSchema.parse({ owners: ["uid-1"] });
    expect(site.system).toBe("homebrew");
  });

  it("defaults license to '0' when missing", () => {
    const site = SiteSchema.parse({ owners: ["uid-1"] });
    expect(site.license).toBe("0");
  });

  it("defaults hidden to false when missing", () => {
    const site = SiteSchema.parse({ owners: ["uid-1"] });
    expect(site.hidden).toBe(false);
  });

  it("defaults useSidebar to true when missing", () => {
    const site = SiteSchema.parse({ owners: ["uid-1"] });
    expect(site.useSidebar).toBe(true);
  });

  it("defaults customPageKeys to false when missing", () => {
    const site = SiteSchema.parse({ owners: ["uid-1"] });
    expect(site.customPageKeys).toBe(false);
  });

  it("defaults usePlainTextURLs to false when missing", () => {
    const site = SiteSchema.parse({ owners: ["uid-1"] });
    expect(site.usePlainTextURLs).toBe(false);
  });

  it("defaults sortOrder to 'name' when missing", () => {
    const site = SiteSchema.parse({ owners: ["uid-1"] });
    expect(site.sortOrder).toBe("name");
  });

  it("preserves optional fields when provided", () => {
    const site = SiteSchema.parse({
      key: "site-1",
      name: "Campaign",
      system: "dnd5e",
      description: "An adventure",
      posterURL: "https://example.com/poster.jpg",
      owners: ["uid-1"],
      players: ["uid-2", "uid-3"],
      hidden: true,
    });
    expect(site.name).toBe("Campaign");
    expect(site.system).toBe("dnd5e");
    expect(site.description).toBe("An adventure");
    expect(site.posterURL).toBe("https://example.com/poster.jpg");
    expect(site.players).toEqual(["uid-2", "uid-3"]);
    expect(site.hidden).toBe(true);
  });

  it("parses legacy Firestore doc after migrateLegacySiteFields", () => {
    const raw = {
      key: "site-legacy",
      name: "Legacy Site",
      owners: ["uid-1"],
      customPageKeys: true,
      sortOrder: "created",
    };
    const migrated = migrateLegacySiteFields(raw as never);
    const site = SiteSchema.parse(migrated);
    // customPageKeys=true → usePlainTextURLs=false
    expect(site.usePlainTextURLs).toBe(false);
    // 'created' → 'createdAt'
    expect(site.sortOrder).toBe("createdAt");
  });
});

describe("createSite factory", () => {
  it("returns a blank Site that re-parses cleanly through SiteSchema", () => {
    const site = createSite();
    expect(() => SiteSchema.parse(site)).not.toThrow();
  });

  it("name defaults to '[...]'", () => {
    const site = createSite();
    expect(site.name).toBe("[...]");
  });

  it("system defaults to 'homebrew'", () => {
    const site = createSite();
    expect(site.system).toBe("homebrew");
  });

  it("hidden defaults to false", () => {
    const site = createSite();
    expect(site.hidden).toBe(false);
  });

  it("license defaults to '0'", () => {
    const site = createSite();
    expect(site.license).toBe("0");
  });

  it("owners is an array (empty default)", () => {
    const site = createSite();
    expect(Array.isArray(site.owners)).toBe(true);
  });

  it("preserves fields supplied in partial over defaults", () => {
    const site = createSite({ name: "My Campaign", system: "pathfinder", owners: ["uid-1"] });
    expect(site.name).toBe("My Campaign");
    expect(site.system).toBe("pathfinder");
    expect(site.owners).toEqual(["uid-1"]);
  });
});
