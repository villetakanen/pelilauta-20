<script>
/**
 * ColorScale.svelte (Svelte 4 style)
 * Internal documentation component for visualizing tonal ramps with contrast validation.
 */
export let title = "Tonal Scale";
export let colors = [];
export let labels = [];
export let textColors = [];

let isGrayscale = false;

function getLuminance(label) {
  if (label === undefined) return 1;
  const L = typeof label === "number" ? label / 100 : parseInt(String(label), 10) / 100;
  if (Number.isNaN(L)) return 1;
  return ((L + 0.16) / 1.16) ** 3;
}

function getContrast(l1, l2) {
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

function getContrastColor(ratio) {
  if (ratio < 3.0) return "var(--chroma-warning-40)";
  if (ratio < 4.5) return "var(--chroma-warning-90)";
  return "inherit";
}

const lum0 = 0;
const lum10 = getLuminance(10);
const lum90 = getLuminance(90);
const lum100 = 1;

function toggleGrayscale() {
  isGrayscale = !isGrayscale;
}
</script>

<div class="color-scale-wrapper" class:grayscale={isGrayscale}>
  <header>
    <h3>{title}</h3>
    <button 
      class="luminance-toggle" 
      on:click={toggleGrayscale} 
      type="button"
      aria-pressed={isGrayscale}
    >
      {isGrayscale ? 'Color' : 'Grayscale'}
    </button>
  </header>

  <div class="swatches">
    {#each colors as color, i}
      <div class="column">
        <div 
          class="swatch" 
          style="background-color: {color}; color: {textColors[i] || (parseInt(String(labels[i] ?? 0)) < 50 ? 'white' : 'black')};"
        >
          <span class="label">{labels[i] ?? 0}</span>
        </div>
        
        <div class="contrast-matrix">
          <div class="row" title="Relative to Step 10 or 90">
             <span class="val" style="color: {getContrastColor(parseInt(String(labels[i] ?? 0)) < 50 ? getContrast(getLuminance(labels[i]), lum90) : getContrast(getLuminance(labels[i]), lum10))}">
               {(parseInt(String(labels[i] ?? 0)) < 50 ? getContrast(getLuminance(labels[i]), lum90) : getContrast(getLuminance(labels[i]), lum10)).toFixed(2)}
             </span>
          </div>
          <div class="row sub" title="Relative to 0 or 100">
             <span class="val" style="color: {getContrastColor(parseInt(String(labels[i] ?? 0)) < 50 ? getContrast(getLuminance(labels[i]), lum100) : getContrast(getLuminance(labels[i]), lum0))}">
               {(parseInt(String(labels[i] ?? 0)) < 50 ? getContrast(getLuminance(labels[i]), lum100) : getContrast(getLuminance(labels[i]), lum0)).toFixed(2)}
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
