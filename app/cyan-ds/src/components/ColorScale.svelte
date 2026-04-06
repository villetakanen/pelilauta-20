<script lang="ts">
/**
 * ColorScale.svelte
 * Internal documentation component for visualizing tonal ramps with contrast validation.
 */
let {
  title = "Tonal Scale",
  colors = [],
  labels = [],
} = $props<{
  title?: string;
  colors: string[];
  labels?: string[];
}>();

let isGrayscale = $state(false);

/**
 * Deterministic OKLCH to Relative Luminance (Y) Helper
 * Standard WCAG 2.1 requires Y (Relative Luminance) not Perceptual Lightness (L).
 */
function getLuminanceFromStep(label: string | number): number {
  const L = typeof label === "number" ? label / 100 : parseInt(label) / 100;
  if (isNaN(L)) return 1;
  return ((L + 0.16) / 1.16) ** 3;
}

/**
 * WCAG 2.1 Contrast Ratio Formula
 */
function getContrastRatioRaw(l1: number, l2: number) {
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Conditional Contrast Semantic Coloring
 */
function getContrastColor(ratio: number) {
  if (ratio < 3.0) return "var(--chroma-warning-40)"; // Critical Fail
  if (ratio < 4.5) return "var(--chroma-warning-90)"; // AA Warning
  return "inherit"; // Pass
}

// System baseline luminances
const lum0 = 0; // Step 0 (Black)
const lum10 = getLuminanceFromStep(10);
const lum90 = getLuminanceFromStep(90);
const lum100 = 1; // Step 100 (White)
</script>

<div class="color-scale-wrapper" class:grayscale={isGrayscale}>
  <header>
    <h3>{title}</h3>
    <button 
      class="luminance-toggle" 
      onclick={() => isGrayscale = !isGrayscale} 
      aria-pressed={isGrayscale}
    >
      {isGrayscale ? 'Color' : 'Grayscale'}
    </button>
  </header>

  <div class="swatches">
    {#each colors as color, i}
      {@const step = labels[i] ?? 0}
      {@const lumCurrent = getLuminanceFromStep(step)}
      {@const ratioBaseline = parseInt(String(step)) < 50 ? getContrastRatioRaw(lumCurrent, lum90) : getContrastRatioRaw(lumCurrent, lum10)}
      {@const ratioTerminal = parseInt(String(step)) < 50 ? getContrastRatioRaw(lumCurrent, lum100) : getContrastRatioRaw(lumCurrent, lum0)}
      
      <div class="column">
        <div 
          class="swatch" 
          style:background={color}
          style:color={parseInt(String(step)) < 50 ? "white" : "black"}
        >
          <span class="label">{step}</span>
        </div>
        
        <div class="contrast-matrix">
          <div class="row" title="Relative to Step 10 or 90">
             <span class="val" style:color={getContrastColor(ratioBaseline)}>
               {ratioBaseline.toFixed(2)}
             </span>
          </div>
          <div class="row sub" title="Relative to 0 or 100">
             <span class="val" style:color={getContrastColor(ratioTerminal)}>
               {ratioTerminal.toFixed(2)}
             </span>
          </div>
        </div>
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

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--cn-text-medium);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05rem;
  }

  .luminance-toggle {
    background: var(--cn-surface-2, white);
    border: 1px solid var(--cn-border, #ccc);
    padding: 0.4rem 0.8rem;
    border-radius: var(--cn-radius-sm, 4px);
    font-size: 0.75rem;
    cursor: pointer;
    font-weight: 700;
    text-transform: uppercase;
    transition: all 0.2s ease;
  }

  .luminance-toggle:hover {
    background: var(--cn-primary-90, #0066cc);
    color: var(--cn-primary-10);
    border-color: transparent;
  }

  .swatches {
    display: flex;
    gap: 2px;
  }

  .column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .swatch {
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    position: relative;
  }

  .label {
    font-family: var(--cn-font-family-mono, monospace);
    font-size: 0.7rem;
    font-weight: 700;
    opacity: 0.8;
  }

  .contrast-matrix {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .row {
    font-family: var(--cn-font-family-mono, monospace);
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--cn-text-medium);
  }

  .row.sub {
    opacity: 0.5;
    font-weight: 400;
  }

  @media (max-width: 600px) {
    .swatches {
      flex-wrap: wrap;
    }
    .column {
      min-width: 18%;
    }
  }
</style>
