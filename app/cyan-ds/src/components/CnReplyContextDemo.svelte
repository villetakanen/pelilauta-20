<script lang="ts">
import CnReplyContext from "@cyan/components/CnReplyContext.svelte";

interface Props {
  user?: string;
  text?: string;
  avatarUrl?: string;
}

let { user = "tapa", text = "Let's start the game", avatarUrl = undefined }: Props = $props();

let dismissed = $state(false);
let log = $state<string[]>([]);

function ondismiss() {
  log = [...log, `Dismissed reply context for @${user} at ${new Date().toLocaleTimeString()}`];
  dismissed = true;
}

function reset() {
  dismissed = false;
}
</script>

<section class="cn-reply-context-demo">
  {#if dismissed}
    <div class="cn-reply-context-demo__dismissed">
      <span>Reply context dismissed.</span>
      <button type="button" onclick={reset}>Restore</button>
    </div>
  {:else}
    <CnReplyContext {user} {text} {avatarUrl} {ondismiss} />
  {/if}

  <details class="cn-reply-context-demo__log">
    <summary>Dismiss log ({log.length})</summary>
    {#if log.length === 0}
      <p class="cn-reply-context-demo__empty">Click the × button to dismiss.</p>
    {:else}
      <ol>
        {#each log as entry, i (i)}
          <li>{entry}</li>
        {/each}
      </ol>
    {/if}
  </details>
</section>

<style>
  .cn-reply-context-demo {
    display: flex;
    flex-direction: column;
    gap: var(--cn-gap);
    margin: var(--cn-gap) 0;
  }

  .cn-reply-context-demo__dismissed {
    display: flex;
    align-items: center;
    gap: var(--cn-gap);
    color: var(--cn-text-low);
  }

  .cn-reply-context-demo__dismissed button {
    padding: var(--cn-grid) var(--cn-gap);
    border: 1px solid var(--cn-border);
    border-radius: var(--cn-border-radius-small);
    background: var(--cn-surface-1);
    color: var(--cn-text);
    cursor: pointer;
  }

  .cn-reply-context-demo__log ol {
    margin: var(--cn-grid) 0 0;
    padding-left: calc(var(--cn-gap) * 1.5);
  }

  .cn-reply-context-demo__empty {
    color: var(--cn-text-low);
    margin: var(--cn-grid) 0 0;
  }
</style>
