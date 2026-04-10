<script lang="ts">
import type { Snippet } from "svelte";
import CnIcon from "./CnIcon.svelte";

let {
  elevation = 1 as 0 | 1 | 2 | 3 | 4,
  href,
  cover,
  srcset,
  sizes,
  noun,
  notify = false,
  alert = false,
  title = "",
  description = "",
  actions,
  children,
} = $props<{
  elevation?: 0 | 1 | 2 | 3 | 4;
  href?: string;
  cover?: string;
  srcset?: string;
  sizes?: string;
  noun?: string;
  notify?: boolean;
  alert?: boolean;
  title?: string;
  description?: string;
  actions?: Snippet;
  children?: Snippet;
}>();
</script>

<article
  class="cn-card elevation-{elevation}"
  class:has-notify={notify}
  class:has-alert={alert}
>
  {#if cover}
    <div class="cover" aria-hidden="true">
      {#if href}
        <a href={href} tabindex="-1">
          <img src={cover} {srcset} {sizes} alt="" loading="lazy" />
          <div class="tint"></div>
        </a>
      {:else}
        <img src={cover} {srcset} {sizes} alt="" loading="lazy" />
        <div class="tint"></div>
      {/if}
    </div>
    {#if noun}
      <div class="cover-noun">
        <CnIcon {noun} size="large" />
      </div>
    {/if}
  {/if}

  <div class="card-header">
    <h4 class="title">
      {#if href}
        <a href={href}>
          {#if !cover && noun}
            <CnIcon {noun} size="small" />
          {/if}
          {title}
        </a>
      {:else}
        {#if !cover && noun}
          <CnIcon {noun} size="small" />
        {/if}
        {title}
      {/if}
    </h4>
  </div>

  <div class="card-info">
    {#if description}
      <p class="description">{description}</p>
    {/if}

    {#if children}
      {@render children()}
    {/if}
  </div>

  <div class="spacer"></div>

  {#if actions}
    <nav class="actions">
      {@render actions()}
    </nav>
  {/if}
</article>

<style>
  .cn-card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    border-radius: var(--cn-border-radius-card, var(--cn-border-radius-large));
    position: relative;
    container-type: inline-size;
    flex-grow: 1;
    transition: background 0.27s ease-in-out;
    font-family: var(--cn-font-family);
    font-size: var(--cn-font-size-text);
    font-weight: var(--cn-font-weight-text);
    line-height: var(--cn-line-height-text);
    letter-spacing: var(--cn-letter-spacing-text);
    color: var(--cn-text-low);
    padding: var(--cn-grid) var(--cn-gap);
    overflow: hidden;
    min-height: calc(7 * var(--cn-line));
  }

  /* Elevation handled by .elevation-N utility classes from elevation.css */

  /* Triangular corner indicator (notify/alert) */
  .cn-card::after {
    content: "";
    position: absolute;
    top: -1px;
    right: -1px;
    width: calc(7 * var(--cn-grid));
    height: calc(7 * var(--cn-grid));
    background: none;
    opacity: 0;
    z-index: 0;
    pointer-events: none;
    transition: opacity 0.2s ease-in-out;
    will-change: opacity, background;
    clip-path: polygon(100% 0, 0 0, 100% 100%);
    border-radius: 0 var(--cn-border-radius-large) 0 0;
  }
  .cn-card.has-notify::after {
    background: var(--cn-color-info);
    opacity: 1;
  }
  .cn-card.has-alert::after {
    background: var(--cn-color-warning);
    opacity: 1;
  }

  /* Cover image */
  .cover {
    padding: 0;
    margin: calc(-1 * var(--cn-grid)) calc(-1 * var(--cn-gap));
    margin-bottom: 0;
    border-radius: var(--cn-border-radius-card, var(--cn-border-radius-large));
    max-height: 100cqw;
    overflow: hidden;
    position: relative;
  }
  .cover img {
    width: calc(100cqw + var(--cn-gap) * 2);
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: var(--cn-border-radius-card, var(--cn-border-radius-large));
    display: block;
    position: relative;
  }
  .cover a {
    display: contents;
  }

  /* Tint gradient over cover — uses primary chroma for punchy branded overlay */
  .tint {
    position: absolute;
    bottom: 0;
    left: 0;
    height: min(95cqw, 44%);
    width: calc(100cqw + var(--cn-gap) * 2);
    z-index: 1;
    background: linear-gradient(
      0deg,
      color-mix(in oklch,
        light-dark(var(--chroma-primary-95), var(--chroma-primary-30)) 70%,
        transparent),
      transparent
    );
    background-blend-mode: hard-light;
    pointer-events: none;
    border-radius: 0 0 var(--cn-border-radius-card, var(--cn-border-radius-large)) var(--cn-border-radius-card, var(--cn-border-radius-large));
  }

  /* Card header: icon + title row */
  .card-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: var(--cn-grid);
  }

  /* Noun icon: inline beside title (no cover) */
  .title :global(.cn-icon) {
    flex-shrink: 0;
    vertical-align: middle;
    margin-right: var(--cn-grid);
    color: var(--cn-text-heading);
  }

  /* Noun icon: top-right corner (with cover) */
  .cover-noun {
    position: absolute;
    top: calc(1 * var(--cn-grid));
    right: calc(1 * var(--cn-grid));
    margin: 0;
    padding: 0;
    z-index: 2;
    filter: drop-shadow(0 0 4px var(--cn-shadow-color));
    color: var(--cn-text-heading);
  }

  /* Title */
  .title {
    margin: 0;
    padding: 0;
    font-family: var(--cn-font-family);
    font-weight: var(--cn-font-weight-h4);
    font-size: var(--cn-font-size-headline-card, var(--cn-font-size-h4));
    line-height: var(--cn-line-height-headline-card, var(--cn-line-height-h4));
    letter-spacing: var(--cn-letter-spacing-headline-card, normal);
    color: var(--cn-text-heading);
    /* 2-line truncation */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .title a {
    color: var(--cn-text-heading);
    text-decoration: none;
  }
  .title a:hover {
    text-decoration: underline;
  }
  .title a:focus-visible {
    outline: 2px solid var(--cn-focus-ring);
    outline-offset: 2px;
    border-radius: 2px;
  }

  /* Card info: description + body content */
  .card-info {
    padding: var(--cn-grid) 0;
  }
  .description {
    margin: 0;
    font-size: var(--cn-font-size-text-small, 0.875rem);
    color: var(--cn-text-low);
  }

  /* Spacer pushes actions to card bottom */
  .spacer {
    flex-grow: 1;
  }

  /* Actions: edge-to-edge nav */
  .actions {
    margin-left: calc(-1 * var(--cn-gap));
    margin-right: calc(-1 * var(--cn-gap));
  }
</style>
