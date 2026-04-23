<script lang="ts">
import CnIcon from "@cyan/components/CnIcon.svelte";
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  signInWithRedirect,
} from "@pelilauta/firebase/client";
import { logError } from "@pelilauta/utils/log";
import { sanitizeNext } from "@pelilauta/utils/sanitizeNext";
import { onMount } from "svelte";

// Error-code mapping per specs/pelilauta/auth/spec.md §Architecture.
const ERROR_MESSAGES: Record<string, string> = {
  "auth/network-request-failed": "Network error. Please check your connection.",
  "auth/account-exists-with-different-credential":
    "An account already exists with the same email using a different sign-in method.",
};
const FALLBACK_ERROR = "Login failed. Please try again.";

const NEXT_KEY = "pelilauta.auth.next";

const provider = new GoogleAuthProvider();

let { next = "/" } = $props<{ next?: string }>();

let loading = $state(false);
let completing = $state(false);
let error = $state<string | null>(null);

onMount(async () => {
  // If a previous click wrote NEXT_KEY, we are very likely returning from OAuth —
  // render the completing state immediately to avoid flashing the CTA button
  // and to close the click-during-mount race window.
  const initialNextKey = sessionStorage.getItem(NEXT_KEY);
  if (initialNextKey !== null) {
    completing = true;
  }

  const auth = getAuth();
  try {
    // Fallback pattern: getRedirectResult can return null on Chromium even
    // when the redirect actually succeeded (Firebase SDK quirk with storage
    // partitioning). It still processes the incoming OAuth response as a
    // side effect — `auth.currentUser` becomes populated. So if we initiated
    // a redirect (sessionStorage has our key) and a user is now present,
    // proceed with the handshake regardless of getRedirectResult's nullity.
    const result = await getRedirectResult(auth);
    const user = result?.user ?? (initialNextKey !== null ? auth.currentUser : null);
    // Snapshot and clear the key unconditionally — the spec's "Either outcome
    // clears the sessionStorage key" clause covers all branches below.
    const stored = sessionStorage.getItem(NEXT_KEY) ?? "/";
    sessionStorage.removeItem(NEXT_KEY);

    if (user !== null) {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (response.ok) {
        const target = sanitizeNext(stored);
        window.location.assign(target);
      } else {
        error = FALLBACK_ERROR;
        completing = false;
      }
    } else {
      // Fresh visit (or stale key with no pending redirect) — drop to CTA.
      completing = false;
    }
  } catch (e) {
    logError("[LoginButton] getRedirectResult failed", e);
    sessionStorage.removeItem(NEXT_KEY);
    const code = (e as { code?: string })?.code;
    error = (code && ERROR_MESSAGES[code]) || FALLBACK_ERROR;
    completing = false;
  }
});

async function handleLogin() {
  loading = true;
  error = null;
  const sanitized = sanitizeNext(next);
  sessionStorage.setItem(NEXT_KEY, sanitized);

  try {
    const auth = getAuth();
    await signInWithRedirect(auth, provider);
  } catch (e) {
    logError("[LoginButton] login failed", e);
    sessionStorage.removeItem(NEXT_KEY);
    const code = (e as { code?: string })?.code;
    error = (code && ERROR_MESSAGES[code]) || FALLBACK_ERROR;
    loading = false;
  }
}
</script>

{#if completing}
  <div class="cn-login-button-container">
    <p role="status" aria-live="polite">Completing sign-in...</p>
  </div>
{:else}
  <div class="cn-login-button-container">
    <button
      class="cta"
      onclick={handleLogin}
      disabled={loading}
      aria-busy={loading}
    >
      <CnIcon noun="google" />
      <span>{loading ? "Redirecting..." : "Sign in with Google"}</span>
    </button>

    {#if error}
      <p class="error-feedback" role="alert">{error}</p>
    {/if}
  </div>
{/if}

<style>
  .cn-login-button-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--cn-grid);
  }

  .error-feedback {
    color: var(--cn-color-error);
    font-size: var(--cn-font-size-text-small);
    margin: 0;
  }
</style>
