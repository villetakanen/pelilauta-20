// Unit tests for CnLightbox — covers what jsdom can faithfully observe:
// DOM structure, prop→markup mapping, and modal open/close state.
// Computed styles (aspect-ratio, object-fit, mask gradient), scroll behaviour,
// ESC-to-close (native dialog), and backdrop-click are covered by
// app/cyan-ds/e2e/components/cn-lightbox.spec.ts (real browser, real CSS engine).
//
// Verifies: specs/cyan-ds/components/cn-lightbox/spec.md §Empty gallery renders nothing
// Verifies: specs/cyan-ds/components/cn-lightbox/spec.md §Single image renders as full-width figure
// Verifies: specs/cyan-ds/components/cn-lightbox/spec.md §Multiple images render as horizontal scroll strip
// Verifies: specs/cyan-ds/components/cn-lightbox/spec.md §Caption serves as alt text
// Verifies: specs/cyan-ds/components/cn-lightbox/spec.md §Clicking an image opens the modal
// Verifies: specs/cyan-ds/components/cn-lightbox/spec.md §Modal closes on close-button click

import { fireEvent, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CnLightbox from "./CnLightbox.svelte";

const ONE_IMAGE = [{ src: "test.jpg", caption: "test caption" }];
const TWO_IMAGES = [
  { src: "a.jpg", caption: "Image A" },
  { src: "b.jpg", caption: "Image B" },
];
const THREE_IMAGES = [
  { src: "a.jpg", caption: "Alpha" },
  { src: "b.jpg", caption: "Beta" },
  { src: "c.jpg", caption: "Gamma" },
];

describe("CnLightbox — empty gallery", () => {
  it("renders no figure, no flex-container, and no dialog when images = []", () => {
    const { container } = render(CnLightbox, { props: { images: [] } });
    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelector(".flex-container")).toBeNull();
    // dialog must not exist at all when images is empty (empty-renders-nothing guardrail)
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("renders no .single-figure when images = []", () => {
    const { container } = render(CnLightbox, { props: { images: [] } });
    expect(container.querySelector(".single-figure")).toBeNull();
  });
});

describe("CnLightbox — single image", () => {
  it("renders a .single-figure element for a one-image array", () => {
    const { container } = render(CnLightbox, { props: { images: ONE_IMAGE } });
    expect(container.querySelector(".single-figure")).not.toBeNull();
  });

  it("does NOT render a .flex-container for a one-image array", () => {
    const { container } = render(CnLightbox, { props: { images: ONE_IMAGE } });
    expect(container.querySelector(".flex-container")).toBeNull();
  });

  it("renders an img with src and loading=lazy inside .single-figure", () => {
    const { container } = render(CnLightbox, { props: { images: ONE_IMAGE } });
    const img = container.querySelector(".single-figure img") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("test.jpg");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("renders a figcaption inside .single-figure", () => {
    const { container } = render(CnLightbox, { props: { images: ONE_IMAGE } });
    const figcaption = container.querySelector(".single-figure figcaption");
    expect(figcaption).not.toBeNull();
  });
});

describe("CnLightbox — caption as alt text", () => {
  it("sets img alt equal to caption (single image)", () => {
    const { container } = render(CnLightbox, {
      props: { images: [{ src: "x.jpg", caption: "Sunset over the lake" }] },
    });
    const img = container.querySelector("img") as HTMLImageElement | null;
    expect(img?.getAttribute("alt")).toBe("Sunset over the lake");
  });

  it("sets figcaption text equal to caption (single image)", () => {
    const { container } = render(CnLightbox, {
      props: { images: [{ src: "x.jpg", caption: "Sunset over the lake" }] },
    });
    const figcaption = container.querySelector("figcaption");
    expect(figcaption?.textContent?.trim()).toBe("Sunset over the lake");
  });

  it("sets img alt equal to caption for each image in multi-image strip", () => {
    const { container } = render(CnLightbox, { props: { images: TWO_IMAGES } });
    const imgs = container.querySelectorAll(".square-figure img");
    expect(imgs[0].getAttribute("alt")).toBe("Image A");
    expect(imgs[1].getAttribute("alt")).toBe("Image B");
  });
});

describe("CnLightbox — multiple images", () => {
  it("renders a .flex-container for a two-image array", () => {
    const { container } = render(CnLightbox, { props: { images: TWO_IMAGES } });
    expect(container.querySelector(".flex-container")).not.toBeNull();
  });

  it("renders the correct number of .square-figure children", () => {
    const { container } = render(CnLightbox, { props: { images: THREE_IMAGES } });
    const figures = container.querySelectorAll(".square-figure");
    expect(figures).toHaveLength(3);
  });

  it("each .square-figure contains an img and a figcaption", () => {
    const { container } = render(CnLightbox, { props: { images: TWO_IMAGES } });
    const figures = container.querySelectorAll(".square-figure");
    for (const fig of figures) {
      expect(fig.querySelector("img")).not.toBeNull();
      expect(fig.querySelector("figcaption")).not.toBeNull();
    }
  });

  it("does NOT render a .single-figure for a two-image array", () => {
    const { container } = render(CnLightbox, { props: { images: TWO_IMAGES } });
    expect(container.querySelector(".single-figure")).toBeNull();
  });
});

describe("CnLightbox — modal open/close", () => {
  let showModalSpy: ReturnType<typeof vi.spyOn>;
  let closeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // jsdom does not implement showModal/close — install stubs before spying.
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = () => {};
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = () => {};
    }
    // Use function (not arrow) so `this` refers to the dialog instance.
    // Simulate what a real browser does: showModal sets open; close removes it.
    showModalSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    });
    closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
    });
  });

  afterEach(() => {
    showModalSpy.mockRestore();
    closeSpy.mockRestore();
  });

  it("dialog does not have open attribute initially", () => {
    const { container } = render(CnLightbox, { props: { images: ONE_IMAGE } });
    const dialog = container.querySelector("dialog") as HTMLDialogElement | null;
    expect(dialog?.hasAttribute("open")).toBe(false);
  });

  it("clicking the single-figure opens the dialog", async () => {
    const { container } = render(CnLightbox, { props: { images: ONE_IMAGE } });
    const figure = container.querySelector(".single-figure") as HTMLElement;
    await fireEvent.click(figure);
    const dialog = container.querySelector("dialog") as HTMLDialogElement | null;
    // jsdom does not implement showModal() natively; we test that the open
    // attribute was set via the component's effect binding.
    // In jsdom the dialog[open] won't reflect via showModal, but the
    // selectedImage state drives the img inside the dialog.
    const modalImg = dialog?.querySelector("img");
    expect(modalImg).not.toBeNull();
    expect(modalImg?.getAttribute("src")).toBe("test.jpg");
  });

  it("clicking a square-figure in multi strip sets modal image", async () => {
    const { container } = render(CnLightbox, { props: { images: TWO_IMAGES } });
    const figures = container.querySelectorAll(".square-figure");
    await fireEvent.click(figures[1] as HTMLElement);
    const dialog = container.querySelector("dialog");
    const modalImg = dialog?.querySelector("img") as HTMLImageElement | null;
    expect(modalImg?.getAttribute("src")).toBe("b.jpg");
    expect(modalImg?.getAttribute("alt")).toBe("Image B");
  });

  it("clicking the close button removes modal image from the dialog and calls close()", async () => {
    const { container } = render(CnLightbox, { props: { images: ONE_IMAGE } });
    // Open modal first
    const figure = container.querySelector(".single-figure") as HTMLElement;
    await fireEvent.click(figure);
    // Verify it opened (showModal was called, and the img is rendered inside dialog)
    expect(showModalSpy).toHaveBeenCalled();
    const dialog = container.querySelector("dialog");
    expect(dialog?.querySelector("img")).not.toBeNull();
    // Now close
    const closeButton = container.querySelector(".close-button") as HTMLElement;
    await fireEvent.click(closeButton);
    // dialog.close() must have been called
    expect(closeSpy).toHaveBeenCalled();
    // After close, dialog should have no img (selectedImage = null)
    expect(dialog?.querySelector("img")).toBeNull();
  });
});
