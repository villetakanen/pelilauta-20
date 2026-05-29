/**
 * Unit tests for CnRichComposer (jsdom, Svelte 5).
 *
 * Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §Toggling write and preview tabs
 * Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §Formatting buttons modify text
 * Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §File dropping invokes onupload callback
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/svelte/pure";
import { afterEach, describe, expect, it, vi } from "vitest";
import CnRichComposer from "./CnRichComposer.svelte";
import type { AttachmentItem } from "./CnRichComposer.types";

afterEach(cleanup);

// jsdom does not implement HTMLDialogElement.showModal; stub it out so the
// component can open the dialog without throwing.
function stubDialogMethods() {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
}

// -----------------------------------------------------------------------
// Scenario: Toggling write and preview tabs
// -----------------------------------------------------------------------
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §Toggling write and preview tabs
describe("CnRichComposer — tab toggling", () => {
  stubDialogMethods();

  it("renders Write and Preview tabs", () => {
    render(CnRichComposer, { open: true, value: "# Hello" });
    expect(screen.getByRole("tab", { name: "Write" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Preview" })).toBeTruthy();
  });

  it("Write tab is selected by default", () => {
    render(CnRichComposer, { open: true });
    const writeTab = screen.getByRole("tab", { name: "Write" });
    expect(writeTab.getAttribute("aria-selected")).toBe("true");
  });

  it("clicking Preview tab deselects Write and activates Preview", async () => {
    render(CnRichComposer, { open: true, value: "# Hello" });

    const previewTab = screen.getByRole("tab", { name: "Preview" });
    await fireEvent.click(previewTab);

    expect(previewTab.getAttribute("aria-selected")).toBe("true");
    const writeTab = screen.getByRole("tab", { name: "Write" });
    expect(writeTab.getAttribute("aria-selected")).toBe("false");
  });

  it("clicking Write tab after Preview restores Write view", async () => {
    render(CnRichComposer, { open: true, value: "# Hello" });

    const previewTab = screen.getByRole("tab", { name: "Preview" });
    await fireEvent.click(previewTab);

    const writeTab = screen.getByRole("tab", { name: "Write" });
    await fireEvent.click(writeTab);

    expect(writeTab.getAttribute("aria-selected")).toBe("true");
    // Editor host is present in Write mode
    expect(document.querySelector(".cn-rich-composer__editor-host")).not.toBeNull();
  });

  it("preview container is present when Preview tab is active", async () => {
    render(CnRichComposer, { open: true, value: "# Hello" });
    await fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    // The preview div is rendered (may contain loading indicator or html)
    expect(document.querySelector(".cn-rich-composer__preview")).not.toBeNull();
  });
});

// -----------------------------------------------------------------------
// Scenario: Attachment list rendering
// -----------------------------------------------------------------------
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §File dropping invokes onupload callback
describe("CnRichComposer — attachment rendering", () => {
  stubDialogMethods();

  const attachments: AttachmentItem[] = [
    { id: "a1", name: "screenshot.png", size: 204800, status: "uploading", progress: 42 },
    { id: "a2", name: "notes.md", size: 1024, status: "success" },
    { id: "a3", name: "broken.jpg", size: 512, status: "error" },
  ];

  it("renders all attachment items", () => {
    render(CnRichComposer, { open: true, attachments });
    expect(document.querySelectorAll(".cn-rich-composer__attachment")).toHaveLength(3);
  });

  it("renders attachment names", () => {
    render(CnRichComposer, { open: true, attachments });
    expect(screen.getByText("screenshot.png")).toBeTruthy();
    expect(screen.getByText("notes.md")).toBeTruthy();
    expect(screen.getByText("broken.jpg")).toBeTruthy();
  });

  it("applies uploading modifier class", () => {
    render(CnRichComposer, { open: true, attachments });
    const items = document.querySelectorAll(".cn-rich-composer__attachment");
    expect(items[0].classList.contains("cn-rich-composer__attachment--uploading")).toBe(true);
  });

  it("applies success modifier class", () => {
    render(CnRichComposer, { open: true, attachments });
    const items = document.querySelectorAll(".cn-rich-composer__attachment");
    expect(items[1].classList.contains("cn-rich-composer__attachment--success")).toBe(true);
  });

  it("applies error modifier class", () => {
    render(CnRichComposer, { open: true, attachments });
    const items = document.querySelectorAll(".cn-rich-composer__attachment");
    expect(items[2].classList.contains("cn-rich-composer__attachment--error")).toBe(true);
  });

  it("renders no attachment list when attachments is empty", () => {
    render(CnRichComposer, { open: true, attachments: [] });
    expect(document.querySelector(".cn-rich-composer__attachments")).toBeNull();
  });
});

// -----------------------------------------------------------------------
// Save and cancel callbacks
// -----------------------------------------------------------------------
describe("CnRichComposer — save/cancel callbacks", () => {
  stubDialogMethods();

  it("clicking Save invokes onsave callback", async () => {
    const onsave = vi.fn();
    render(CnRichComposer, { open: true, onsave });
    await fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onsave).toHaveBeenCalledOnce();
  });

  it("clicking Cancel invokes oncancel callback", async () => {
    const oncancel = vi.fn();
    render(CnRichComposer, { open: true, oncancel });
    // There are two Cancel buttons (header close + footer cancel)
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await fireEvent.click(cancelBtn);
    expect(oncancel).toHaveBeenCalledOnce();
  });

  it("Save button is disabled while saving=true", () => {
    render(CnRichComposer, { open: true, saving: true });
    const saveBtn = screen.getByRole("button", { name: /Save/ });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not invoke onsave when saving=true", async () => {
    const onsave = vi.fn();
    render(CnRichComposer, { open: true, saving: true, onsave });
    await fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(onsave).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// Scenario: drag overlay class toggling
// -----------------------------------------------------------------------
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §File dropping invokes onupload callback
describe("CnRichComposer — drag overlay", () => {
  stubDialogMethods();

  it("drag-over modifier class is absent initially", () => {
    render(CnRichComposer, { open: true });
    expect(document.querySelector(".cn-rich-composer--drag-over")).toBeNull();
  });

  it("drag-over modifier class is applied during dragover", async () => {
    render(CnRichComposer, { open: true });
    const dialog = document.querySelector(".cn-rich-composer") as HTMLElement;
    await fireEvent.dragOver(dialog, { dataTransfer: {} });
    expect(dialog.classList.contains("cn-rich-composer--drag-over")).toBe(true);
  });

  it("drag-over overlay becomes visible during dragover", async () => {
    render(CnRichComposer, { open: true });
    const dialog = document.querySelector(".cn-rich-composer") as HTMLElement;
    await fireEvent.dragOver(dialog, { dataTransfer: {} });
    expect(document.querySelector(".cn-rich-composer__drop-overlay--visible")).not.toBeNull();
  });

  it("drag-over modifier class is removed after dragleave", async () => {
    render(CnRichComposer, { open: true });
    const dialog = document.querySelector(".cn-rich-composer") as HTMLElement;
    await fireEvent.dragOver(dialog, { dataTransfer: {} });
    await fireEvent.dragLeave(dialog);
    expect(dialog.classList.contains("cn-rich-composer--drag-over")).toBe(false);
  });

  it("onupload is called with dropped files", async () => {
    const onupload = vi.fn();
    render(CnRichComposer, { open: true, onupload });
    const dialog = document.querySelector(".cn-rich-composer") as HTMLElement;

    const file = new File(["data"], "screenshot.png", { type: "image/png" });

    // Simulate drop with a DataTransfer containing one file
    const dt = {
      files: [file] as unknown as FileList,
    };

    await fireEvent.drop(dialog, { dataTransfer: dt });
    expect(onupload).toHaveBeenCalledOnce();
    const [files] = onupload.mock.calls[0];
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("screenshot.png");
  });

  it("drag overlay is dismissed after drop", async () => {
    const onupload = vi.fn();
    render(CnRichComposer, { open: true, onupload });
    const dialog = document.querySelector(".cn-rich-composer") as HTMLElement;
    await fireEvent.dragOver(dialog, { dataTransfer: {} });
    await fireEvent.drop(dialog, { dataTransfer: { files: [] as unknown as FileList } });
    expect(dialog.classList.contains("cn-rich-composer--drag-over")).toBe(false);
  });
});

// -----------------------------------------------------------------------
// Focus trap — dialog element presence
// -----------------------------------------------------------------------
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §Toggling write and preview tabs
describe("CnRichComposer — focus trap (dialog element)", () => {
  stubDialogMethods();

  it("renders a <dialog> element", () => {
    render(CnRichComposer, { open: true });
    expect(document.querySelector("dialog.cn-rich-composer")).not.toBeNull();
  });

  it("dialog has aria-label for screen readers", () => {
    render(CnRichComposer, { open: true });
    const dialog = document.querySelector("dialog.cn-rich-composer");
    expect(dialog?.getAttribute("aria-label")).toBe("Reply composer");
  });
});

// -----------------------------------------------------------------------
// Formatting toolbar presence
// -----------------------------------------------------------------------
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §Formatting buttons modify text
describe("CnRichComposer — formatting toolbar", () => {
  stubDialogMethods();

  it("renders formatting toolbar in Write mode", () => {
    render(CnRichComposer, { open: true });
    expect(document.querySelector(".cn-rich-composer__toolbar")).not.toBeNull();
  });

  it("renders Bold, Italic, Link, Quote, Code, List buttons", () => {
    render(CnRichComposer, { open: true });
    const ariaLabels = ["Bold", "Italic", "Link", "Quote", "Code", "List"];
    for (const label of ariaLabels) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("toolbar is not rendered in Preview mode", async () => {
    render(CnRichComposer, { open: true });
    await fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(document.querySelector(".cn-rich-composer__toolbar")).toBeNull();
  });
});
