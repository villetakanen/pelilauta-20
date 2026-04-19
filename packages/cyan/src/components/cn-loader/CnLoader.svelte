<script lang="ts">
import CnIcon from "../CnIcon.svelte";

let {
  noun = "fox",
  inline = false,
  label = "Loading",
} = $props<{
  noun?: string;
  inline?: boolean;
  label?: string;
}>();
</script>

<span
  class="cn-loader"
  class:cn-loader-inline={inline}
  role="status"
  aria-label={label}
>
  <span class="lds-dual-ring" aria-hidden="true"></span>
  <CnIcon {noun} size={inline ? "small" : "large"} />
</span>

<style>
  .cn-loader {
    /* V2: changed to block to allow horizontal margin centering to win */
    display: block;
    position: relative;
    width: var(--cn-loader-size);
    height: var(--cn-loader-size);
    box-sizing: border-box;
    vertical-align: middle;
    color: var(--cn-loader-color);
  }

  .cn-loader-inline {
    width: var(--cn-line);
    height: var(--cn-line);
    display: inline-block;
  }

  /* Centered icon styling — icon is the same square as the loader
     (large = 72px for default, small = 24px for inline) so the ring
     overlays directly on top with no gap. */
  .cn-loader :global(.cn-icon) {
    position: absolute;
    inset: 0;
    opacity: 0.44;
    margin: 0;
    pointer-events: none;
    color: currentColor;
  }

  /* Spinning ring styling */
  .lds-dual-ring {
    display: block;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    position: absolute;
    inset: 0;
  }

  /* V6: Fix centring and wobble */
  .lds-dual-ring:after {
    content: " ";
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: var(--cn-loader-line-width) solid var(--cn-loader-color);
    border-color: var(--cn-loader-color) transparent var(--cn-loader-color) transparent;
    animation: lds-dual-ring 1.2s linear infinite;
    opacity: 0.72;
    box-sizing: border-box;
  }

  @keyframes lds-dual-ring {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Accessibility: Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .lds-dual-ring:after {
      animation: none;
    }
  }
</style>
