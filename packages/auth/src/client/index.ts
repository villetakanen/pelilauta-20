// CSR-only barrel for @pelilauta/auth.
//
// Anonymous-reachable host modules use `import type` only - see
// specs/pelilauta/auth-package/spec.md §Constraints.
export { AuthedFetchError, authedFetch } from "./authedFetch";
export type { SessionProfile, SessionState } from "./session";
export { fullLogout, logout, profile, sessionState, uid } from "./session";
