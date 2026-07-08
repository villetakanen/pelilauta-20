<script lang="ts">
/**
 * AuthHandler — CSR island for session reconciliation and token lifecycle.
 *
 * Spec: specs/pelilauta/session/spec.md, specs/pelilauta/session/state-machine.md
 *   - Mounted only when SSR determines the session is active (server cookie
 *     verified), so every reconcile run starts from a server-valid session.
 *   - Seeds the session store from SSR props to avoid hydration flash.
 *   - Owns `onAuthStateChanged` and reconciliation via `/api/auth/status`.
 *   - A missing or mismatched client SDK user is recovered via
 *     `POST /api/auth/custom-token`; teardown (`fullLogout`) happens only on
 *     authoritative server rejection or failed recovery.
 */

import {
  fullLogout,
  profile,
  type SessionProfile,
  sessionState,
  uid,
} from "@pelilauta/auth/client";
import { getAuth, onAuthStateChanged, signInWithCustomToken } from "@pelilauta/firebase/client";
import { logError } from "@pelilauta/utils/log";
import { onMount } from "svelte";

interface Props {
  ssrUid: string;
  ssrProfile: SessionProfile | null;
}

let { ssrUid, ssrProfile }: Props = $props();

/**
 * recover — re-signs the client SDK in as the cookie's identity via a
 * server-minted custom token. Single-shot: any failure exits via fullLogout.
 */
async function recover(auth: ReturnType<typeof getAuth>) {
  try {
    // On uid mismatch the server identity wins: drop the wrong client user first.
    if (auth.currentUser) await auth.signOut();

    const resp = await fetch("/api/auth/custom-token", { method: "POST" });
    if (!resp.ok) throw new Error(`Custom-token endpoint returned ${resp.status}`);
    const { token } = await resp.json();
    await signInWithCustomToken(auth, token);
  } catch (e) {
    logError("[AuthHandler] session recovery failed", e);
    await fullLogout();
  }
}

// In-flight guard: recovery's own signOut() re-fires onAuthStateChanged(null),
// which would otherwise start a second concurrent reconcile run.
let reconciling = false;

/**
 * reconcile — checks the server's opinion of the session when the client
 * disagrees or is stale. State transitions: state-machine.md §States.
 */
async function reconcile() {
  if (reconciling) return;
  reconciling = true;
  try {
    await runReconcile();
  } finally {
    reconciling = false;
  }
}

async function runReconcile() {
  let loggedIn: boolean;
  let serverUid: string | undefined;
  let frozen: boolean | undefined;
  try {
    const resp = await fetch("/api/auth/status", { cache: "no-store" });
    if (!resp.ok) throw new Error(`Status oracle returned ${resp.status}`);
    ({ loggedIn, uid: serverUid, frozen } = await resp.json());
  } catch (e) {
    // Oracle unreachable — not evidence the session is invalid: the cookie was
    // verified server-side on the paint that mounted this island. Keep it.
    logError("[AuthHandler] status oracle unreachable, keeping SSR session", e);
    return;
  }

  if (!loggedIn || serverUid !== ssrUid) {
    // Server no longer recognizes this session.
    await fullLogout();
    return;
  }

  // Server says we are good — propagate frozen status to the profile store.
  // Read the live atom value to avoid stale closure of ssrProfile.
  const currentProfile = profile.get() ?? ssrProfile;
  profile.set({
    nick: currentProfile?.nick ?? "User",
    avatarURL: currentProfile?.avatarURL,
    frozen: frozen ?? false,
  });

  const auth = getAuth();
  if (auth.currentUser?.uid === ssrUid) {
    // Stale onAuthStateChanged snapshot — wake the SDK with a forced refresh.
    try {
      await auth.currentUser.getIdToken(true);
    } catch (e) {
      logError("[AuthHandler] token refresh failed", e);
      await fullLogout();
    }
    return;
  }

  // Client user is missing or belongs to a different uid than the cookie.
  await recover(auth);
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
