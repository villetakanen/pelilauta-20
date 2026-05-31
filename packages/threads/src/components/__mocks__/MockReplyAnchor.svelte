<script lang="ts">
// Minimal CnReplyAnchor mock for unit tests.
import type { Snippet } from "svelte";

let {
  children,
  overhead,
}: {
  fixed?: boolean;
  children?: Snippet;
  overhead?: Snippet;
} = $props();
</script>

<aside data-testid="cn-reply-anchor">
  {#if overhead}
    <div data-testid="cn-reply-anchor-overhead">
      {@render overhead()}
    </div>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</aside>
