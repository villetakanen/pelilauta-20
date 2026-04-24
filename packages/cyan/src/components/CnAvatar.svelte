<script lang="ts">
import CnIcon from "./CnIcon.svelte";

/**
 * CnAvatar.svelte
 * A circular avatar primitive that renders an image, initials, or a generic placeholder.
 * Deterministic background colors are derived from the 'nick' prop using OKLCH.
 */
interface Props {
  src?: string;
  nick?: string;
  size?: "small" | "medium";
}

let { src, nick, size = "medium" }: Props = $props();

/**
 * Deterministic Hash for Background Color (sum of char codes % 100)
 */
function getNickHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
  }
  return hash % 100;
}

let initials = $derived(nick ? nick.slice(0, 2).toUpperCase() : "");
let hash = $derived(nick ? getNickHash(nick) : null);

// Background Color logic: color-mix(in oklch, surface-30, surface-60 {hash}%)
let backgroundColor = $derived(
  hash !== null
    ? `color-mix(in oklch, var(--chroma-surface-30), var(--chroma-surface-60) ${hash}%)`
    : "var(--cn-surface-2)",
);

let avatarSize = $derived(
  size === "small" ? "calc(var(--cn-line) * 1.5)" : "calc(var(--cn-line) * 2)",
);
let iconSize = $derived(size === "small" ? "small" : "medium");

// Reactive image-load failure state. Reset whenever `src` changes so a new
// URL gets a fresh attempt after a prior failure.
let imageErrored = $state(false);
$effect(() => {
  if (src) imageErrored = false;
});

let showImage = $derived(!!src && !imageErrored);
</script>

<div
  class="cn-avatar cn-avatar--{size}"
  style="--avatar-bg: {backgroundColor}; --avatar-size: {avatarSize};"
  role="img"
  aria-label={nick ? `${nick}'s avatar` : "User avatar"}
  data-nick={nick}
  data-size={size}
>
  {#if showImage}
    <img
      {src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      class="cn-avatar__image"
      onerror={() => (imageErrored = true)}
    />
  {/if}

  <div
    class="cn-avatar__fallback"
    aria-hidden="true"
    style={showImage ? "display: none;" : "display: flex;"}
  >
    {#if nick}
      <span class="cn-avatar__initials">{initials}</span>
    {:else}
      <CnIcon noun="avatar" size={iconSize} />
    {/if}
  </div>
</div>

<style>
  .cn-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--avatar-size);
    height: var(--avatar-size);
    border-radius: 50%;
    overflow: hidden;
    background-color: var(--avatar-bg);
    position: relative;
    user-select: none;
    flex-shrink: 0;
    aspect-ratio: 1/1;
  }

  .cn-avatar__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
  }

  .cn-avatar__fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  .cn-avatar__initials {
    font-weight: 700;
    color: var(--chroma-surface-95);
    text-transform: uppercase;
    font-size: calc(var(--avatar-size) * 0.4);
    line-height: 1;
  }

  .cn-avatar--small .cn-avatar__initials {
    font-size: calc(var(--avatar-size) * 0.45);
  }
</style>
