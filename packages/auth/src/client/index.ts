// CSR-only barrel for @pelilauta/auth.
//
// Stage 3 (issue #22) lands the session atoms (`sessionState`, `uid`,
// `profile`), the mutators (`logout`, `fullLogout`), and `authedFetch`.
// Anonymous-reachable host modules use `import type` only — see
// specs/pelilauta/auth-package/spec.md §Constraints.
export {};
