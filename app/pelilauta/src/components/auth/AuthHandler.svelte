<script lang="ts">
/**
 * AuthHandler — CSR island for session reconciliation and token lifecycle.
 *
 * Spec: specs/pelilauta/session/spec.md
 *   - Mounted only when SSR determines the user is active.
 *   - Seeds the session store from SSR props to avoid hydration flash.
 *   - Owns `onAuthStateChanged` and reconciliation via `/api/auth/status`.
 *   - Triggers full-page logout if client/server state diverges irreconcilably.
 */

import { getAuth, onAuthStateChanged } from "@pelilauta/firebase/client";
import { logError } from "@pelilauta/utils/log";
import { onMount } from "svelte";
import {
  logout as clearSessionStore,
  profile,
  type SessionProfile,
  sessionState,
  uid,
} from "../../stores/session";

interface Props {
  ssrUid: string;
  ssrProfile: SessionProfile | null;
}

let { ssrUid, ssrProfile }: Props = $props();

/**
 * fullLogout — authoritative exit. Clears cookie, signs out, and reloads.
 * Load-bearing: the reload flips the next SSR paint to anonymous.
 */
async function performLogout() {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
    const auth = getAuth();
    await auth.signOut();
  } catch (e) {
    logError("[AuthHandler] Error during logout flow", e);
  } finally {
    clearSessionStore();
    window.location.reload();
  }
}

/**
 * reconcile — checks the server's opinion of the session when the client
 * disagrees or is stale.
 */
async function reconcile() {
  try {
    const resp = await fetch("/api/auth/status", { cache: "no-store" });
    if (!resp.ok) throw new Error(`Status oracle returned ${resp.status}`);

    const { loggedIn, uid: serverUid } = await resp.json();

    if (!loggedIn || serverUid !== ssrUid) {
      // Server no longer recognizes this session.
      await performLogout();
      return;
    }

    // Server says we are good, but client is missing the user.
    // Force a token refresh to try and wake up the client SDK.
    const auth = getAuth();
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    } else {
      // No user at all even after server said we're logged in.
      // It's possible the SDK is still initializing, but onAuthStateChanged(null)
      // is our signal that it has already failed to find a local session.
      await performLogout();
    }
  } catch (e) {
    logError("[AuthHandler] reconciliation failed", e);
    await performLogout();
  }
}

onMount(() => {
  // 1. Seed store immediately from SSR context.
  uid.set(ssrUid);
  profile.set(ssrProfile);
  sessionState.set("active");

  // 2. Subscribe to Firebase auth state.
  const auth = getAuth();
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!user || user.uid !== ssrUid) {
      // Client-side drift detected. Reconcile with the server.
      reconcile();
    }
  });

  return unsubscribe;
});
</script>

<!-- Headless component — no UI -->
