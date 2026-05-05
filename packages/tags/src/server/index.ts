// SSR-safe barrel for @pelilauta/tags.
//
// Re-exports schemas, types, registry data, and pure lookup helpers.
// No Firebase imports — the package has no Firestore reader at MVP.
// See specs/pelilauta/tags/spec.md §Architecture.

export { SUPERTAGS } from "../data/supertags";
export { getSupertag } from "../helpers/getSupertag";
export { resolveTagSynonym } from "../helpers/resolveTagSynonym";
export { type SupertagEntry, SupertagSchema } from "../schemas/SupertagSchema";
export { TAG_FIRESTORE_COLLECTION, type Tag, TagSchema } from "../schemas/TagSchema";
