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
  title,
  description,
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
  title?: Snippet;
  description?: Snippet;
  actions?: Snippet;
  children?: Snippet;
}>();

// Root element type selection: Anchor if href is provided, otherwise Article
const RootElement = href ? "a" : "article";
</script>

<!-- svelte-ignore a11y_missing_attribute -->
<svelte:element 
  this={RootElement} 
  {href}
  class="cn-card" 
  class:is-clickable={!!href}
  style="--elevation: {elevation};"
>
  {#if cover}
    <div class="cover">
      <img src={cover} {srcset} {sizes} alt="" loading="lazy" />
      {#if noun}
        <div class="cover-icon">
          <CnIcon {noun} size="small" />
        </div>
      {/if}
    </div>
  {/if}

  <div class="card-content">
    <header>
      <div class="title-row">
        {#if !cover && noun}
          <div class="inline-icon">
            <CnIcon {noun} size="small" />
          </div>
        {/if}
        <h4 class="title">
          {#if title}
            {@render title()}
          {/if}
        </h4>
      </div>
      {#if description}
        <div class="description">
          {@render description()}
        </div>
      {/if}
    </header>

    {#if children}
      <div class="body">
        {@render children()}
      </div>
    {/if}

    {#if actions}
      <footer class="actions">
        {@render actions()}
      </footer>
    {/if}
  </div>

  <!-- Indicators (Top-right badges) -->
  <div class="indicators">
    {#if notify}
      <span class="indicator notify" aria-label="Notification"></span>
    {/if}
    {#if alert}
      <span class="indicator alert" aria-label="Alert"></span>
    {/if}
  </div>
</svelte:element>

<style>
  .cn-card {
    display: block;
    position: relative;
    background-color: var(--cn-card-background, var(--cn-surface-1));
    border-radius: var(--cn-border-radius-card, var(--cn-border-radius-large));
    border: 1px solid var(--cn-border);
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    
    /* Support for elevation 0-4 using semantic shadow tokens */
    --elevation-shadow: none;
  }

  .cn-card[style*="--elevation: 1"] {
    --elevation-shadow: 0 2px 4px var(--cn-shadow-color);
  }
  .cn-card[style*="--elevation: 2"] {
    --elevation-shadow: var(--cn-shadow-elevation-2);
  }
  .cn-card[style*="--elevation: 3"] {
    --elevation-shadow: var(--cn-shadow-elevation-3);
  }
  .cn-card[style*="--elevation: 4"] {
    --elevation-shadow: var(--cn-shadow-elevation-4);
  }

  .cn-card {
    box-shadow: var(--elevation-shadow);
  }

  .is-clickable:hover {
    border-color: var(--cn-border-hover);
    background-color: var(--cn-surface-2);
    transform: translateY(-2px);
    box-shadow: var(--cn-shadow-elevation-2);
  }

  .cover {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background-color: var(--cn-surface-3);
  }

  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-icon {
    position: absolute;
    bottom: var(--cn-gap);
    left: var(--cn-gap);
    padding: calc(var(--cn-grid) * 0.5);
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    border-radius: var(--cn-border-radius-small);
    color: white;
    display: flex;
  }

  .card-content {
    padding: var(--cn-gap);
    display: flex;
    flex-direction: column;
    gap: var(--cn-grid);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--cn-grid);
    margin-bottom: calc(var(--cn-grid) * 0.5);
  }

  .title {
    margin: 0;
    font-size: var(--cn-font-size-headline-card, var(--cn-font-size-h4));
    line-height: var(--cn-line-height-h4);
    font-weight: var(--cn-font-weight-h4);
    color: var(--cn-text-heading);
    /* 2-line truncation (ADR-001 requirement) */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .description {
    font-size: var(--cn-font-size-text-small, 0.875rem);
    color: var(--cn-text-low);
    margin: 0;
  }

  .actions {
    margin-top: var(--cn-gap);
    display: flex;
    justify-content: flex-end;
    gap: var(--cn-grid);
  }

  /* Indicators */
  .indicators {
    position: absolute;
    top: calc(var(--cn-grid) * 1.5);
    right: calc(var(--cn-grid) * 1.5);
    display: flex;
    gap: calc(var(--cn-grid) * 0.5);
    pointer-events: none;
  }

  .indicator {
    display: block;
    width: calc(var(--cn-grid) * 1.5);    height: calc(var(--cn-grid) * 1.5);
    border-radius: 50%;
    border: 2px solid var(--cn-surface-1);
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }

  .indicator.notify {
    background-color: var(--cn-color-info);
  }

  .indicator.alert {
    background-color: var(--cn-color-error);
  }
</style>
