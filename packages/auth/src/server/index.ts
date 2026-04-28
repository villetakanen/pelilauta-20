// SSR-safe barrel for @pelilauta/auth.
//
// Stage 2 (issue #21) lands `projectProfileFromClaims`, `SessionProfile`,
// `SessionState`. Must remain free of `firebase/client`, nanostores, and
// any Svelte component imports — see specs/pelilauta/auth-package/spec.md
// §SSR Safety.
export {};
