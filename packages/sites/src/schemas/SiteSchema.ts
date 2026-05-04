// SiteSchema — legacy-tolerant Zod schema for site documents.
//
// Field shape is preserved verbatim from
// .tmp/pelilauta-17/src/schemas/SiteSchema.ts — every field name, type,
// default, and .optional() marker carries forward. v20 delta: none.
//
// Legacy tolerance for Firestore Timestamps is encoded via a z.preprocess
// wrapper that coerces createdAt/updatedAt through toDate() before the
// schema validates them — mirrors ThreadSchema's approach.
//
// Storage shape preserved per feedback_no_breaking_data_contracts.

import { EntrySchema, toDate } from "@pelilauta/models";
import { z } from "zod";
import { CategoryRefSchema } from "./CategoryRefSchema";
import { PageRefSchema } from "./PageRefSchema";

// Pre-parse normalization — coerces Firestore Timestamps to Date objects
// and normalizes flowTime to epoch milliseconds. Matches ThreadSchema pattern.
const normalizeRawSite = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") return raw;
  const data = { ...(raw as Record<string, unknown>) };

  // Unconditional timestamp coercion — toDate() handles Firestore Timestamp /
  // number / string / Date / null / undefined with new Date(0) fallback.
  data.createdAt = toDate(data.createdAt);
  data.updatedAt = toDate(data.updatedAt);

  return data;
};

export const SITES_COLLECTION_NAME = "sites";

// Minimal AssetSchema — matches v17's AssetSchema field shape.
// Defined locally until @pelilauta/models exposes it.
const AssetSchema = z.object({
  url: z.string(),
  name: z.string().default(""),
  description: z.string().default(""),
  license: z.string().default("0"),
  mimetype: z.string().optional(),
  storagePath: z.string().optional(),
  size: z.number().optional(),
  uploadedAt: z.string().optional(),
  uploadedBy: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const SiteSortOrderSchema = z.enum(["name", "createdAt", "flowTime", "manual"]);
export type SiteSortOrder = z.infer<typeof SiteSortOrderSchema>;

export const SiteSchema = z.preprocess(
  normalizeRawSite,
  EntrySchema.extend({
    // Core fields
    name: z.string().default("[...]"),
    system: z.string().default("homebrew"),
    description: z.string().optional(),
    homepage: z.string().optional(),
    license: z.string().default("0"),

    // Visibility
    hidden: z.boolean().default(false),

    // Media/assets
    posterURL: z.string().optional(),
    avatarURL: z.string().optional(),
    backgroundURL: z.string().optional(),
    assets: z.array(AssetSchema).optional(),

    // Page organization
    sortOrder: SiteSortOrderSchema.default("name"),
    customPageKeys: z.boolean().default(false),
    usePlainTextURLs: z.boolean().default(false),
    pageRefs: z.array(PageRefSchema).optional(),
    pageCategories: z.array(CategoryRefSchema).optional(),

    // Players
    players: z.array(z.string()).optional(),
    usePlayers: z.boolean().optional(),

    // Features / options
    useClocks: z.boolean().optional(),
    useHandouts: z.boolean().optional(),
    useRecentChanges: z.boolean().optional(),
    useSidebar: z.boolean().default(true),
    sidebarKey: z.string().optional(),
    useCharacters: z.boolean().optional(),
    useCharacterKeeper: z.boolean().optional(),
    characterKeeperSheetKey: z.string().optional(),
  }),
);

export type Site = z.infer<typeof SiteSchema>;

/**
 * Creates a new Site object with default values.
 * Use this for creating new sites from scratch or templates.
 *
 * Entry fields (key, flowTime, owners, createdAt, updatedAt) are handled by
 * the schema defaults and should be managed by toFirestoreEntry when saving.
 *
 * @param partial - Partial site data to merge with defaults
 * @returns Valid Site object with all required fields and defaults applied
 *
 * @example
 * const site = createSite({ name: 'My Campaign' });
 */
export function createSite(partial: Partial<Site> = {}): Site {
  return SiteSchema.parse(partial);
}
