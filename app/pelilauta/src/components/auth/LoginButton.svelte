<script lang="ts">
import CnIcon from "@cyan/components/CnIcon.svelte";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "@pelilauta/firebase/client";
import { logError } from "@pelilauta/utils/log";

// Error-code mapping per specs/pelilauta/auth/spec.md §Architecture.
const ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign-in popup was closed. Please try again.",
  "auth/popup-blocked": "Popup was blocked by the browser.",
  "auth/network-request-failed": "Network error. Please check your connection.",
};
const FALLBACK_ERROR = "Login failed. Please try again.";

// Defense in depth per spec §Regression Guardrails. Page-level validation in
// login.astro is primary; this rejects anything that isn't a same-origin
// relative path and falls back to "/".
function sanitizeNext(candidate: string): string {
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return "/";
  return candidate;
}

const provider = new GoogleAuthProvider();

let { next = "/" } = $props<{ next?: string }>();

let loading = $state(false);
let error = $state<string | null>(null);

async function handleLogin() {
  loading = true;
  error = null;

  try {
    const auth = getAuth();
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to create session on server");
    }

    // Successful login requires a full page reload to flip from anonymous-SSR
    // to authenticated-SSR. See specs/pelilauta/auth/spec.md §Architecture.
    window.location.assign(sanitizeNext(next));
  } catch (e) {
    logError("[LoginButton] login failed", e);
    const code = (e as { code?: string })?.code;
    error = (code && ERROR_MESSAGES[code]) || FALLBACK_ERROR;
    loading = false;
  }
}
</script>

<div class="cn-login-button-container">
  <button
    class="cta"
    onclick={handleLogin}
    disabled={loading}
    aria-busy={loading}
  >
    <CnIcon noun="google" />
    <span>{loading ? "Signing in..." : "Sign in with Google"}</span>
  </button>

  {#if error}
    <p class="error-feedback" role="alert">{error}</p>
  {/if}
</div>

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
