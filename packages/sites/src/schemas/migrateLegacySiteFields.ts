// migrateLegacySiteFields — backwards-compatibility field transformer.
//
// Ported verbatim from .tmp/pelilauta-17/src/schemas/SiteSchema.ts
// (migrateLegacySiteFields). Applied inside every read accessor before
// SiteSchema.parse() — never applied after.
//
// Two transformations:
//   (a) customPageKeys → !usePlainTextURLs when the latter is missing
//   (b) legacy sortOrder values: 'created' → 'createdAt', 'updated' → 'flowTime'

import type { Site, SiteSortOrder } from "./SiteSchema";

/**
 * Migrates legacy site data fields to current schema.
 * Handles backwards compatibility transformations.
 *
 * @param data - Legacy site data
 * @returns Migrated site data compatible with current schema
 */
export function migrateLegacySiteFields(data: Partial<Site>): Partial<Site> {
  const migrated = { ...data };

  // Handle customPageKeys ↔ usePlainTextURLs relationship
  // customPageKeys is legacy, inverted logic of usePlainTextURLs
  if (data.customPageKeys !== undefined && data.usePlainTextURLs === undefined) {
    migrated.usePlainTextURLs = !data.customPageKeys;
  }

  // Handle legacy sortOrder values
  // Map old values: 'created' → 'createdAt', 'updated' → 'flowTime'
  if (typeof data.sortOrder === "string") {
    const sortOrderMap: Record<string, SiteSortOrder> = {
      created: "createdAt",
      updated: "flowTime",
    };
    const legacyValue = data.sortOrder as string;
    if (legacyValue in sortOrderMap) {
      migrated.sortOrder = sortOrderMap[legacyValue];
    }
  }

  return migrated;
}
