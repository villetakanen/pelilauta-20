// SSR-safe barrel for @pelilauta/sites.
//
// Re-exports schemas, types, and read-only accessors.
// Must not import from `../client/` or any `firebase/*` (non-admin) module.
// MembershipBadge.svelte is CSR-only and is NOT re-exported here — it lives
// behind ./components.

export { getSite } from "../api/getSite";
export { getSites } from "../api/getSites";
export * from "../schemas/CategoryRefSchema";
export { migrateLegacySiteFields } from "../schemas/migrateLegacySiteFields";
export * from "../schemas/PageRefSchema";
export {
  createSite,
  SITES_COLLECTION_NAME,
  type Site,
  SiteSchema,
  type SiteSortOrder,
  SiteSortOrderSchema,
} from "../schemas/SiteSchema";
export { systemToNoun } from "./systemToNoun";
