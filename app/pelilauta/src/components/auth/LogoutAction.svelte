<script lang="ts">
import { onMount } from "svelte";
import { fullLogout, sessionState } from "../../stores/session";

let busy = $state(false);
let errored = $state(false);

onMount(() =>
  sessionState.subscribe((s) => {
    if (s === "error") {
      busy = false;
      errored = true;
    }
  }),
);

async function onClick() {
  if (busy) return;
  busy = true;
  errored = false;
  await fullLogout();
  // Happy path: fullLogout triggers a full page reload; this component is
  // unmounted before control returns. Error path: the subscribe above clears
  // busy and flips `errored` when sessionState goes to "error".
}
</script>

<div class="logout-action">
  <button
    type="button"
    class="cta"
    onclick={onClick}
    disabled={busy}
    aria-busy={busy}
  >
    {busy ? "Signing out..." : "Sign out"}
  </button>

  {#if errored}
    <p class="logout-error" role="alert">Sign-out failed. Please try again.</p>
  {/if}
</div>

<style>
  .logout-action {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--cn-grid);
  }

  .logout-error {
    color: var(--cn-color-error);
    font-size: var(--cn-font-size-text-small);
    margin: 0;
  }
</style>
