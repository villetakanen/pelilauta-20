import { getAuth } from "@pelilauta/firebase/client";
import { logError } from "@pelilauta/utils/log";
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
 * Clears the local session atoms. Store-level reset only — does NOT touch
 * the server cookie or the Firebase client. Used by `authedFetch` and
 * `AuthHandler` on recoverable drift. For user-initiated sign-out or
 * authoritative failure, use `fullLogout()` instead.
 *
 * Spec: `specs/pelilauta/session/spec.md` §Host components → stores/session.ts.
 */
export function logout() {
  sessionState.set("initial");
  uid.set(null);
  profile.set(null);
}

/**
 * Authoritative exit. DELETE the session cookie, sign out of Firebase, clear
 * the atoms, then force a full page reload so the next paint is anonymous
 * SSR with no CSR bundle mounted.
 *
 * Spec: `specs/pelilauta/session/spec.md` §Authentication Flow step 5.
 * Single entry point for LogoutAction and for AuthHandler's irrecoverable-
 * drift branch.
 *
 * Partial-failure contract: if cookie DELETE throws or returns non-ok,
 * sessionState flips to "error" and the function returns WITHOUT signing out
 * of Firebase, clearing atoms, or reloading. Reloading with a still-valid
 * cookie would re-authenticate the user and make "Sign out" look silently
 * broken. If DELETE succeeds but signOut throws, we proceed anyway — the
 * cookieless reload paints anonymous regardless of local SDK state.
 */
export async function fullLogout(): Promise<void> {
  let cookieCleared = false;
  try {
    const resp = await fetch("/api/auth/session", { method: "DELETE" });
    cookieCleared = resp.ok;
    if (!cookieCleared) {
      logError("[fullLogout] cookie DELETE returned non-ok", resp.status);
    }
  } catch (e) {
    logError("[fullLogout] cookie DELETE threw", e);
  }

  if (!cookieCleared) {
    sessionState.set("error");
    return;
  }

  try {
    await getAuth().signOut();
  } catch (e) {
    logError("[fullLogout] firebase signOut failed after cookie clear", e);
  }

  logout();
  window.location.reload();
}
