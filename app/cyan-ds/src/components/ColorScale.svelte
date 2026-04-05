<script lang="ts">
/**
 * ColorScale.svelte
 * Internal documentation component for visualizing tonal ramps.
 */
let {
  colors = [],
  labels = [],
  textColors = [],
} = $props<{
  colors: string[];
  labels?: string[];
  textColors?: string[];
}>();

let isGrayscale = $state(false);

// Helper to determine if the text on a swatch should be light or dark.
// We assume the colors array follows a 0 (dark) to 100 (light) progression.
// If the index is in the first half, the background is dark (use white text).
// If the index is in the second half, the background is light (use dark text).
function getTextColor(index: number, total: number) {
  const midpoint = total / 2;
  return index < midpoint ? "white" : "black";
}
</script>

<div class="color-scale-wrapper" class:grayscale={isGrayscale}>
  <div class="header">
    <button class="luminance-toggle" onclick={() => isGrayscale = !isGrayscale} aria-pressed={isGrayscale}>
      {isGrayscale ? 'Disable Grayscale' : 'Toggle Luminance (Grayscale)'}
    </button>
  </div>

  <div class="swatches">
    {#each colors as color, i}
      <div 
        class="swatch" 
 style:background={color}
 style:color={textColors[i] ?? getTextColor(i, colors.length)}
      >
        <span class="label">
          {labels[i] ?? i * 10}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  .color-scale-wrapper {
    margin: 2rem 0;
    padding: 1.5rem;
    background: var(--cn-surface-1, #f9f9f9);
    border-radius: var(--cn-radius-md, 8px);
    border: 1px solid var(--cn-border, #eee);
    transition: filter 0.3s ease;
  }

  .grayscale {
    filter: grayscale(1);
  }

  .header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }

  .luminance-toggle {
    background: var(--cn-surface-2, white);
    border: 1px solid var(--cn-border, #ccc);
    padding: 0.4rem 0.8rem;
    border-radius: var(--cn-radius-sm, 4px);
    font-size: 0.8rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .luminance-toggle:hover {
    background: var(--cn-button-accent, #0066cc);
    color: white;
    border-color: transparent;
  }

  .swatches {
    display: flex;
    gap: 4px;
    height: 3rem;
  }

  .swatch {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    position: relative;
    min-width: 0;
  }

  .label {
    font-family: var(--cn-font-family-mono, monospace);
    font-size: 0.7rem;
    font-weight: 700;
    pointer-events: none;
    opacity: 0.8;
  }

  @media (max-width: 600px) {
    .swatches {
      flex-wrap: wrap;
      height: auto;
    }
    .swatch {
      min-width: 15%;
      height: 2rem;
    }
  }
</style>
