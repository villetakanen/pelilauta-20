// Scenarios: "Parse site from Firestore document" (legacy field migration portion)
// — specs/pelilauta/sites/spec.md

import { describe, expect, it } from "vitest";
import { migrateLegacySiteFields } from "./migrateLegacySiteFields";
import type { Site } from "./SiteSchema";

describe("migrateLegacySiteFields", () => {
  it("maps customPageKeys=true to usePlainTextURLs=false when usePlainTextURLs is missing", () => {
    const result = migrateLegacySiteFields({ customPageKeys: true } as Partial<Site>);
    expect(result.usePlainTextURLs).toBe(false);
  });

  it("maps customPageKeys=false to usePlainTextURLs=true when usePlainTextURLs is missing", () => {
    const result = migrateLegacySiteFields({ customPageKeys: false } as Partial<Site>);
    expect(result.usePlainTextURLs).toBe(true);
  });

  it("does not overwrite usePlainTextURLs when it is already set", () => {
    const result = migrateLegacySiteFields({
      customPageKeys: true,
      usePlainTextURLs: true,
    } as Partial<Site>);
    expect(result.usePlainTextURLs).toBe(true);
  });

  it("maps legacy sortOrder 'created' to 'createdAt'", () => {
    // Legacy sortOrder values not in the enum are cast as unknown then Partial<Site>
    const result = migrateLegacySiteFields({
      sortOrder: "created" as unknown as Site["sortOrder"],
    } as Partial<Site>);
    expect(result.sortOrder).toBe("createdAt");
  });

  it("maps legacy sortOrder 'updated' to 'flowTime'", () => {
    const result = migrateLegacySiteFields({
      sortOrder: "updated" as unknown as Site["sortOrder"],
    } as Partial<Site>);
    expect(result.sortOrder).toBe("flowTime");
  });

  it("passes through modern sortOrder values unchanged", () => {
    for (const value of ["name", "createdAt", "flowTime", "manual"] as const) {
      const result = migrateLegacySiteFields({ sortOrder: value } as Partial<Site>);
      expect(result.sortOrder).toBe(value);
    }
  });

  it("is a no-op for already-modern data with no legacy fields", () => {
    const input: Partial<Site> = {
      name: "Campaign",
      system: "homebrew",
      usePlainTextURLs: false,
      sortOrder: "name",
    };
    const result = migrateLegacySiteFields(input);
    expect(result).toEqual(input);
  });

  it("does not mutate the input object", () => {
    const input: Partial<Site> = {
      customPageKeys: true,
      sortOrder: "created" as unknown as Site["sortOrder"],
    };
    const copy = { ...input };
    migrateLegacySiteFields(input);
    expect(input).toEqual(copy);
  });
});
