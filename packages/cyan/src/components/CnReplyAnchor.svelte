<script lang="ts">
import type { Snippet } from "svelte";

let {
  fixed = true,
  children,
  overhead,
}: {
  fixed?: boolean;
  children?: Snippet;
  overhead?: Snippet;
} = $props();
</script>

<aside class="cn-reply-anchor" class:cn-reply-anchor--fixed={fixed}>
  <div class="cn-reply-anchor__surface">
    {#if overhead}
      <div class="cn-reply-anchor__overhead">
        {@render overhead()}
      </div>
    {/if}
    {#if children}
      <div class="cn-reply-anchor__bar">
        {@render children()}
      </div>
    {/if}
  </div>
</aside>

<style>
  /* Outer aside is positioning only; chrome lives on __surface so the
     dock can be width-capped on desktop while the positioning host still
     spans the viewport. */
  .cn-reply-anchor {
    display: block;
  }

  .cn-reply-anchor__surface {
    display: flex;
    flex-direction: column;
    gap: var(--cn-grid);
    padding: var(--cn-grid) var(--cn-gap);
    background: var(--cn-reply-dock-bg);
    border: 1px solid var(--cn-reply-dock-border);
    box-shadow: var(--cn-reply-dock-shadow);
    border-radius: var(--cn-border-radius-large);
  }

  /* Desktop: bottom-sticky, surface centered and capped at 67ch */
  .cn-reply-anchor--fixed {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--cn-z-reply-anchor);
  }

  .cn-reply-anchor--fixed .cn-reply-anchor__surface {
    max-width: 67ch;
    margin-inline: auto;
    margin-block-end: var(--cn-grid);
  }

  /* Mobile: top-fixed below the app bar, surface goes full-bleed */
  @media (max-width: 767px) {
    .cn-reply-anchor--fixed {
      position: fixed;
      top: var(--cn-app-bar-height, calc(var(--cn-grid) * 8));
      bottom: auto;
      left: 0;
      right: 0;
    }
    .cn-reply-anchor--fixed .cn-reply-anchor__surface {
      max-width: none;
      margin-inline: 0;
      margin-block-end: 0;
      border-radius: 0;
      border-inline: none;
      /* Overhead stacks below the bar on mobile (reversed visual order) */
      flex-direction: column-reverse;
    }
  }
</style>
