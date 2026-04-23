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
  if (sessionStorage.getItem(NEXT_KEY) !== null) {
    completing = true;
  }

  const auth = getAuth();
  try {
    const result = await getRedirectResult(auth);
    // Snapshot and clear the key unconditionally — the spec's "Either outcome
    // clears the sessionStorage key" clause covers both branches below.
    const stored = sessionStorage.getItem(NEXT_KEY) ?? "/";
    sessionStorage.removeItem(NEXT_KEY);

    if (result !== null) {
      const idToken = await result.user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (response.ok) {
        window.location.assign(sanitizeNext(stored));
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
  sessionStorage.setItem(NEXT_KEY, sanitizeNext(next));

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
