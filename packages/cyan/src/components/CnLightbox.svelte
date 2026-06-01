<script lang="ts">
import { onMount } from "svelte";
import CnIcon from "./CnIcon.svelte";
import type { CnLightboxImage } from "./CnLightbox.types";

let { images = [] }: { images: CnLightboxImage[] } = $props();

let selectedImage: CnLightboxImage | null = $state(null);
let dialogEl: HTMLDialogElement | undefined = $state(undefined);

// SSR-safe: modal logic runs only after mount in a client-side $effect.
// During SSR there is no DOM, so showModal()/close() must never be called at top level.
onMount(() => {
  $effect(() => {
    if (!dialogEl) return;
    if (selectedImage) {
      // Guard for jsdom (which does not implement showModal).
      if (!dialogEl.open && typeof dialogEl.showModal === "function") {
        dialogEl.showModal();
      }
    } else {
      if (dialogEl.open && typeof dialogEl.close === "function") {
        dialogEl.close();
      }
    }
  });
});

function openModal(image: CnLightboxImage) {
  selectedImage = image;
}

function closeModal() {
  selectedImage = null;
}

function handleDialogClick(event: MouseEvent) {
  // Clicking the ::backdrop area means the dialog element itself is the target.
  if (event.target === dialogEl) {
    closeModal();
  }
}

function handleDialogClose() {
  // Fires when ESC or native close() is called — sync state back to null.
  selectedImage = null;
}
</script>

{#if images.length > 0}
  {#if images.length === 1}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <figure class="single-figure" onclick={() => openModal(images[0])} onkeydown={(e) => e.key === "Enter" && openModal(images[0])}>
      <img src={images[0].src} alt={images[0].caption} loading="lazy" />
      <figcaption class="caption">{images[0].caption}</figcaption>
    </figure>
  {:else}
    <div class="flex-container">
      {#each images as image}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <figure class="square-figure" onclick={() => openModal(image)} onkeydown={(e) => e.key === "Enter" && openModal(image)}>
          <img src={image.src} alt={image.caption} loading="lazy" />
          <figcaption class="caption">{image.caption}</figcaption>
        </figure>
      {/each}
    </div>
  {/if}

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <dialog
    bind:this={dialogEl}
    onclick={handleDialogClick}
    onclose={handleDialogClose}
    aria-label={selectedImage?.caption ?? "Image lightbox"}
  >
    <button class="close-button" onclick={closeModal} aria-label="Close lightbox">
      <CnIcon noun="close" />
    </button>
    {#if selectedImage}
      <img src={selectedImage.src} alt={selectedImage.caption} loading="lazy" />
    {/if}
  </dialog>
{/if}

<style>
  .single-figure {
    margin: 0 0 var(--cn-line);
    padding: var(--cn-lightbox-inner-spacing);
    cursor: pointer;
    background: var(--cn-lightbox-background);
    border-radius: var(--cn-lightbox-border-radius);
    aspect-ratio: 16 / 9;
    container-type: inline-size;
    display: block;
  }

  .single-figure img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    object-position: center;
    border-radius: var(--cn-lightbox-image-border-radius);
    display: block;
  }

  .caption {
    margin: 0 auto;
    text-align: center;
    max-height: var(--cn-line, 1.2em);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--cn-lightbox-color);
  }

  .flex-container {
    display: flex;
    flex-wrap: nowrap;
    gap: var(--cn-lightbox-inner-spacing);
    overflow-x: scroll;
    position: relative;
    margin: 0 0 var(--cn-line);
    padding: var(--cn-lightbox-inner-spacing);
    background: var(--cn-lightbox-background);
    border-radius: var(--cn-lightbox-border-radius);
    aspect-ratio: 16 / 9;
    box-sizing: border-box;
    /* Right-edge fade gradient as scroll discoverability affordance.
       Fades the last var(--cn-grid) (0.5rem) to transparent over the trailing edge. */
    -webkit-mask-image: linear-gradient(
      to right,
      black calc(100% - var(--cn-grid)),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      black calc(100% - var(--cn-grid)),
      transparent 100%
    );
  }

  .square-figure {
    flex-grow: 0;
    flex-shrink: 0;
    margin: 0;
    position: relative;
    height: 100%;
    aspect-ratio: 1 / 1;
    cursor: pointer;
    border-radius: var(--cn-lightbox-image-border-radius);
    overflow: hidden;
  }

  .square-figure img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    aspect-ratio: 1 / 1;
    border-radius: var(--cn-lightbox-image-border-radius);
    display: block;
  }

  .square-figure .caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: color-mix(in srgb, black 80%, transparent);
    color: var(--cn-lightbox-color);
    padding: var(--cn-grid);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    max-width: none;
    border-bottom-left-radius: var(--cn-lightbox-image-border-radius);
    border-bottom-right-radius: var(--cn-lightbox-image-border-radius);
  }

  dialog {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    border: none;
    padding: 0;
    background: transparent;
    display: none;
    justify-content: center;
    align-items: center;
    z-index: var(--z-index-modal);
  }

  dialog[open] {
    display: flex;
  }

  dialog img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    border-radius: var(--cn-lightbox-image-border-radius);
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.8);
  }

  .close-button {
    position: absolute;
    top: var(--cn-gap);
    right: var(--cn-gap);
    background: none;
    border: none;
    color: var(--cn-lightbox-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--cn-grid);
    border-radius: var(--cn-border-radius-small);
    z-index: 1;
  }

  .close-button:hover {
    background: color-mix(in srgb, white 20%, transparent);
  }
</style>
