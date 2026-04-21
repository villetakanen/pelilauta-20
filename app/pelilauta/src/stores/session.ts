import { atom } from "nanostores";

export type SessionState = "initial" | "loading" | "active" | "error";

export interface SessionProfile {
  nick: string;
  avatarURL?: string;
}

/**
 * sessionState atom: tracked lifecycle of the session.
 * initial: store initialized, no check performed yet.
 * loading: actively verifying session/profile.
 * active: session is valid and profile is loaded.
 * error: session check failed or profile load failed.
 */
export const sessionState = atom<SessionState>("initial");

/**
 * uid atom: the authenticated user's Firebase UID.
 * Null if anonymous or not yet loaded.
 */
export const uid = atom<string | null>(null);

/**
 * profile atom: minimal public profile projection.
 * Null if anonymous or not yet loaded.
 */
export const profile = atom<SessionProfile | null>(null);

/**
 * Clears the local session atoms. Sanctioned session-store mutator per
 * `specs/pelilauta/session/spec.md` §API contracts (alongside `AuthHandler`).
 * Cookie deletion (via `DELETE /api/auth/session`) and Firebase `signOut()`
 * are the caller's responsibility — invoked from `AuthHandler` before
 * calling this.
 */
export function logout() {
  sessionState.set("initial");
  uid.set(null);
  profile.set(null);
}
