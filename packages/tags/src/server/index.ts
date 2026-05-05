// SSR-safe barrel for @pelilauta/tags.
//
// Re-exports schemas, types, registry data, pure lookup helpers,
// and the Firestore-backed hasTaggedEntries helper.
// See specs/pelilauta/tags/spec.md §Architecture.

export { hasTaggedEntries } from "../api/hasTaggedEntries";
export { SUPERTAGS } from "../data/supertags";
export { getSupertag } from "../helpers/getSupertag";
export { resolveTagSynonym } from "../helpers/resolveTagSynonym";
export { type SupertagEntry, SupertagSchema } from "../schemas/SupertagSchema";
export { TAG_FIRESTORE_COLLECTION, type Tag, TagSchema } from "../schemas/TagSchema";
