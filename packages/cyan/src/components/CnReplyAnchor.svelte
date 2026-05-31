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
</aside>

<style>
  .cn-reply-anchor {
    display: flex;
    flex-direction: column;
    gap: var(--cn-grid);
    padding: var(--cn-grid) var(--cn-gap);
    background: var(--cn-reply-dock-bg);
    border-top: 1px solid var(--cn-reply-dock-border);
    box-shadow: var(--cn-reply-dock-shadow);
  }

  /* Fixed (sticky) variant — desktop: bottom-sticky */
  .cn-reply-anchor--fixed {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--cn-z-reply-anchor);
  }

  /* Mobile: top-fixed below the app bar, grows downward */
  @media (max-width: 767px) {
    .cn-reply-anchor--fixed {
      position: fixed;
      top: var(--cn-app-bar-height, calc(var(--cn-grid) * 8));
      bottom: auto;
      left: 0;
      right: 0;
      /* On mobile, overhead goes below the main bar (reversed visual order) */
      flex-direction: column-reverse;
    }
  }
</style>
