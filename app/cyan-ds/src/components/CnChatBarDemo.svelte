<script lang="ts">
import CnChatBar from "@cyan/components/CnChatBar.svelte";

interface Props {
  initial?: string;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

let {
  initial = "",
  placeholder = "Write a reply…",
  disabled = false,
  label = "Chat bar",
}: Props = $props();

let value = $state(initial);
let log = $state<string[]>([]);

function onsend(sent: string) {
  log = [...log, sent];
  value = "";
}
</script>

<section class="cn-chat-bar-demo">
  <header class="cn-chat-bar-demo__header">
    <span class="text-medium">{label}</span>
    <span class="cn-chat-bar-demo__hint">Enter sends · Shift+Enter newline</span>
  </header>

  <CnChatBar bind:value {placeholder} {disabled} {onsend} />

  <details class="cn-chat-bar-demo__log">
    <summary>Sent messages ({log.length})</summary>
    {#if log.length === 0}
      <p class="cn-chat-bar-demo__empty">No messages sent yet. Press Enter on a non-empty bar.</p>
    {:else}
      <ol>
        {#each log as entry, i (i)}
          <li><pre>{entry}</pre></li>
        {/each}
      </ol>
    {/if}
  </details>
</section>

<style>
  .cn-chat-bar-demo {
    display: flex;
    flex-direction: column;
    gap: var(--cn-gap);
    margin: var(--cn-gap) 0;
  }
  .cn-chat-bar-demo__header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--cn-gap);
  }
  .cn-chat-bar-demo__hint {
    color: var(--cn-text-low);
    font-size: 0.875em;
  }
  .cn-chat-bar-demo__log ol {
    margin: var(--cn-grid) 0 0;
    padding-left: calc(var(--cn-gap) * 1.5);
  }
  .cn-chat-bar-demo__log pre {
    white-space: pre-wrap;
    word-break: break-word;
    background: var(--cn-surface-2);
    padding: var(--cn-grid) var(--cn-gap);
    border-radius: var(--cn-border-radius-medium);
    margin: 0;
  }
  .cn-chat-bar-demo__empty {
    color: var(--cn-text-low);
    margin: var(--cn-grid) 0 0;
  }
</style>
