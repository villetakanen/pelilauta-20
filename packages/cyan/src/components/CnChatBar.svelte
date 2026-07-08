<script lang="ts">
import type { Snippet } from "svelte";

let {
  value = $bindable(""),
  placeholder = "",
  disabled = false,
  onsend,
  start,
  end,
}: {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onsend?: (value: string) => void;
  start?: Snippet;
  end?: Snippet;
} = $props();

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    if (value.trim().length > 0) {
      onsend?.(value);
    }
    event.preventDefault();
  }
  // Shift+Enter: do nothing — browser default newline insertion applies.
}
</script>

<div class="cn-chat-bar" class:disabled>
  {#if start}
    <div class="cn-chat-bar__slot cn-chat-bar__slot--start">
      {@render start()}
    </div>
  {/if}
  <textarea
    class="cn-chat-bar__input"
    bind:value
    {placeholder}
    {disabled}
    rows="1"
    onkeydown={handleKeydown}
  ></textarea>
  {#if end}
    <div class="cn-chat-bar__slot cn-chat-bar__slot--end">
      {@render end()}
    </div>
  {/if}
</div>

<style>
  /* Transparent wrapper — dock chrome is owned by CnReplyAnchor (or the host
     when used outside the anchor). The bar contributes layout only. */
  .cn-chat-bar {
    display: flex;
    align-items: flex-end;
    gap: var(--cn-grid);
  }

  .cn-chat-bar__input {
    flex: 1;
    min-width: 0;
    resize: none;
    border: none;
    outline: none;
    background: transparent;
    color: var(--cn-on-input);
    font: inherit;
    line-height: 1.5;
    padding: 0;

    /* Auto-expand via field-sizing (modern evergreen browsers). Falls back to
       single-line on unsupported browsers. */
    field-sizing: content;

    /* Desktop: cap at 4 lines */
    max-height: calc(4 * 1.5em);
    overflow-y: auto;
  }

  @media (max-width: 767px) {
    .cn-chat-bar__input {
      /* Mobile: cap relative to viewport to avoid overlapping the top area */
      max-height: 40vh;
    }
  }

  .cn-chat-bar__slot {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .cn-chat-bar.disabled .cn-chat-bar__input {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
