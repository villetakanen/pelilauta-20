// SSR-safe barrel for @pelilauta/threads.
//
// Stage 1 scaffold — empty until schemas + read accessors land in Stage 2.
// Re-exports here must stay SSR-safe: only types, schemas, and read-only
// accessors that live under `../schemas/` and `../api/`. Must not import
// from `../client/` or any `firebase/*` (non-admin) module.

export {};
