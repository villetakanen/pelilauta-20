<script lang="ts">
import type { Snippet } from "svelte";

let { reply = false, children } = $props<{ reply?: boolean; children?: Snippet }>();
</script>

<article class="cn-bubble" class:reply>
  {#if children}
    {@render children()}
  {/if}
</article>

<style>
  .cn-bubble {
    position: relative;
    margin-left: var(--cn-gap);
    margin-right: 0;
    padding: var(--cn-gap) var(--cn-gap) var(--cn-grid);
    min-height: calc(var(--cn-gap) * 4);
    background: var(--cn-bubble);
    color: var(--cn-on-bubble);
    border-radius: 0 var(--cn-border-radius-medium) var(--cn-border-radius-medium)
      var(--cn-border-radius-medium);
  }

  .cn-bubble::after {
    content: "";
    position: absolute;
    top: 0;
    left: calc(-1 * var(--cn-gap));
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 var(--cn-gap) var(--cn-gap) 0;
    border-color: transparent var(--cn-bubble) transparent transparent;
  }

  .cn-bubble.reply {
    margin-left: 0;
    margin-right: var(--cn-gap);
    background: var(--cn-reply-bubble);
    color: var(--cn-on-reply-bubble);
    border-radius: var(--cn-border-radius-medium) 0 var(--cn-border-radius-medium)
      var(--cn-border-radius-medium);
  }

  .cn-bubble.reply::after {
    left: auto;
    right: calc(-1 * var(--cn-gap));
    border-width: 0 0 var(--cn-gap) var(--cn-gap);
    border-color: transparent transparent transparent var(--cn-reply-bubble);
  }

  .cn-bubble > :global(*:first-child) {
    margin-top: 0;
  }

  .cn-bubble > :global(header):first-child {
    margin-top: calc(-1 * var(--cn-gap));
  }

  .cn-bubble > :global(footer):last-child {
    margin-bottom: calc(-1 * var(--cn-grid));
  }
</style>
