<script lang="ts">
/**
 * CnRichComposer — full-featured rich text composer for forum-style replies.
 *
 * Architecture decision: CodeMirror is mounted directly inside this component
 * via `createCnEditor` (same package), rather than via the `<CnEditor>` wrapper.
 * This avoids threading a handle out of CnEditor.svelte and keeps the CodeMirror
 * lifecycle entirely inside this component. The wrapper's two-way binding would
 * add indirection without benefit here since we own the editor lifecycle directly.
 *
 * Visibility: controlled via the `open` prop. The composer uses a native <dialog>
 * element for desktop modal (free focus trap + Esc-close). Mobile (<768px) uses
 * the same <dialog> with CSS full-screen override. `open` prop drives showModal/close.
 */
import { onDestroy, onMount } from "svelte";
import type { AttachmentItem } from "./CnRichComposer.types";
import { type CnEditorHandle, createCnEditor } from "./createCnEditor";

export type { AttachmentItem };

interface Props {
  /** Two-way bound markdown text. */
  value?: string;
  placeholder?: string;
  attachments?: AttachmentItem[];
  /** Shows saving spinner and disables actions when true. */
  saving?: boolean;
  /**
   * Controls the open/closed state of the modal/sheet.
   * NOTE: This prop is not in the current spec body but is required for the
   * modal/sheet visibility contract — without it the consumer cannot open/close
   * the composer. Document for next /spec pass to reconcile.
   */
  open?: boolean;
  onsave?: () => void;
  oncancel?: () => void;
  onupload?: (files: File[]) => void;
}

let {
  value = $bindable(""),
  placeholder = "Write a reply…",
  attachments = [],
  saving = false,
  open = $bindable(false),
  onsave,
  oncancel,
  onupload,
}: Props = $props();

// --- Editor state ---
let editorTarget: HTMLDivElement | undefined = $state();
let handle: CnEditorHandle | undefined;

// --- Tab state ---
type TabMode = "write" | "preview";
let activeTab: TabMode = $state("write");
let previewHtml: string = $state("");
let previewLoading = $state(false);

// --- Drag state ---
let isDraggingOver = $state(false);

// --- Dialog ref ---
let dialogEl: HTMLDialogElement | undefined = $state();

// Keep track of whether we've mounted (SSR guard)
let mounted = false;

onMount(() => {
  mounted = true;

  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      if (!dialogEl.open && typeof dialogEl.showModal === "function") {
        dialogEl.showModal();
      }
    } else {
      if (dialogEl.open && typeof dialogEl.close === "function") {
        dialogEl.close();
      }
    }
  });

  $effect(() => {
    if (!editorTarget) return;
    if (activeTab === "write") {
      // Mount the editor when switching to write tab
      if (!handle) {
        handle = createCnEditor(editorTarget, {
          value,
          placeholder,
          disabled: saving,
          onChange: (next) => {
            value = next;
          },
        });
      }
    }
  });
});

onDestroy(() => {
  handle?.destroy();
  handle = undefined;
});

// Sync value into editor when it changes externally
$effect(() => {
  if (!handle) return;
  if (value !== handle.getValue()) {
    handle.setValue(value);
  }
});

// Sync disabled state
$effect(() => {
  handle?.setDisabled(saving);
});

// Render preview when switching to preview tab or when value changes in preview mode
$effect(() => {
  if (activeTab !== "preview") return;
  // Re-run when value changes while preview is visible
  const currentValue = value;
  previewLoading = true;

  // markdownToHTML is lazy-imported to keep SSR bundle clean
  import("@pelilauta/utils/markdownToHTML")
    .then(({ markdownToHTML }) => markdownToHTML(currentValue))
    .then((html) => {
      previewHtml = html;
      previewLoading = false;
    })
    .catch(() => {
      previewHtml = "<p><em>Preview unavailable.</em></p>";
      previewLoading = false;
    });
});

function handleDialogClose() {
  // Fires when ESC or native close() is triggered — sync open back
  open = false;
  oncancel?.();
}

function handleSave() {
  if (saving) return;
  onsave?.();
}

function handleCancel() {
  open = false;
  oncancel?.();
}

// --- Formatting toolbar ---
interface FormatAction {
  label: string;
  notation: string;
  /** aria-label for the button */
  aria: string;
}

const FORMAT_ACTIONS: FormatAction[] = [
  { label: "B", notation: "**text**", aria: "Bold" },
  { label: "I", notation: "_text_", aria: "Italic" },
  { label: "[…]", notation: "[text](url)", aria: "Link" },
  { label: "> ", notation: "> text", aria: "Quote" },
  { label: "`", notation: "`text`", aria: "Code" },
  { label: "- ", notation: "- text", aria: "List" },
];

function applyFormat(notation: string) {
  if (!handle) return;
  handle.insertText(notation);
}

// --- Drag and drop ---
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDraggingOver = true;
}

function handleDragLeave() {
  isDraggingOver = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDraggingOver = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    onupload?.(Array.from(files));
  }
}

// --- Attachment helpers ---
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<!-- SSR: render nothing; dialog is client-only -->
<dialog
  bind:this={dialogEl}
  class="cn-rich-composer"
  class:cn-rich-composer--drag-over={isDraggingOver}
  aria-label="Reply composer"
  onclose={handleDialogClose}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <!-- Drag overlay -->
  <div
    class="cn-rich-composer__drop-overlay"
    aria-hidden="true"
    class:cn-rich-composer__drop-overlay--visible={isDraggingOver}
  >
    <span class="cn-rich-composer__drop-label">Drop files to attach</span>
  </div>

  <!-- Header: tabs + close -->
  <header class="cn-rich-composer__header">
    <div class="cn-rich-composer__tabs" role="tablist" aria-label="Composer mode">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "write"}
        class="cn-rich-composer__tab"
        class:cn-rich-composer__tab--active={activeTab === "write"}
        onclick={() => (activeTab = "write")}
      >
        Write
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "preview"}
        class="cn-rich-composer__tab"
        class:cn-rich-composer__tab--active={activeTab === "preview"}
        onclick={() => (activeTab = "preview")}
      >
        Preview
      </button>
    </div>
    <button
      type="button"
      class="cn-rich-composer__close"
      aria-label="Close composer"
      onclick={handleCancel}
    >
      ×
    </button>
  </header>

  <!-- Formatting toolbar (visible in Write mode only) -->
  {#if activeTab === "write"}
    <div class="cn-rich-composer__toolbar" role="toolbar" aria-label="Formatting">
      {#each FORMAT_ACTIONS as action}
        <button
          type="button"
          class="cn-rich-composer__format-btn"
          aria-label={action.aria}
          title={action.aria}
          onclick={() => applyFormat(action.notation)}
          disabled={saving}
        >
          {action.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Body: editor or preview -->
  <div class="cn-rich-composer__body">
    {#if activeTab === "write"}
      <div
        bind:this={editorTarget}
        class="cn-rich-composer__editor-host"
        aria-label="Markdown editor"
      ></div>
    {:else}
      <div class="cn-rich-composer__preview" aria-live="polite">
        {#if previewLoading}
          <span class="cn-rich-composer__preview-loading" aria-label="Rendering preview…">…</span>
        {:else}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html previewHtml}
        {/if}
      </div>
    {/if}
  </div>

  <!-- Attachments list -->
  {#if attachments.length > 0}
    <ul class="cn-rich-composer__attachments" aria-label="Attachments">
      {#each attachments as attachment (attachment.id)}
        <li
          class="cn-rich-composer__attachment"
          class:cn-rich-composer__attachment--uploading={attachment.status === "uploading"}
          class:cn-rich-composer__attachment--success={attachment.status === "success"}
          class:cn-rich-composer__attachment--error={attachment.status === "error"}
        >
          {#if attachment.previewUrl}
            <img
              src={attachment.previewUrl}
              alt={attachment.name}
              class="cn-rich-composer__attachment-thumb"
            />
          {/if}
          <span class="cn-rich-composer__attachment-name">{attachment.name}</span>
          <span class="cn-rich-composer__attachment-size">{formatBytes(attachment.size)}</span>
          {#if attachment.status === "uploading"}
            <span class="cn-rich-composer__attachment-status" aria-label="Uploading">
              {#if attachment.progress !== undefined}
                {attachment.progress}%
              {:else}
                …
              {/if}
            </span>
          {:else if attachment.status === "error"}
            <span class="cn-rich-composer__attachment-status cn-rich-composer__attachment-status--error" aria-label="Upload failed">
              ✕
            </span>
          {:else}
            <span class="cn-rich-composer__attachment-status cn-rich-composer__attachment-status--success" aria-label="Uploaded">
              ✓
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Footer: save / cancel -->
  <footer class="cn-rich-composer__footer">
    <button
      type="button"
      class="cn-rich-composer__cancel"
      onclick={handleCancel}
      disabled={saving}
    >
      Cancel
    </button>
    <button
      type="button"
      class="cn-rich-composer__save"
      onclick={handleSave}
      disabled={saving}
      aria-busy={saving}
    >
      {#if saving}
        <span class="cn-rich-composer__saving-indicator" aria-hidden="true">…</span>
      {/if}
      Save
    </button>
  </footer>
</dialog>

<style>
  /* =====================================================================
   * CnRichComposer — responsive modal (desktop) / full-screen sheet (mobile)
   * z-index: var(--cn-z-reply-dialog) = 41000, reserved for this slot.
   * ===================================================================== */

  .cn-rich-composer {
    /* Reset dialog defaults */
    border: none;
    padding: 0;
    background: var(--cn-surface-1);
    color: var(--cn-text);
    border-radius: var(--cn-border-radius-medium);
    box-shadow: var(--cn-shadow-elevation-3);
    z-index: var(--cn-z-reply-dialog);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;

    /* Desktop: centered dialog */
    width: min(680px, 90vw);
    max-height: 80vh;
  }

  .cn-rich-composer[open] {
    display: flex;
  }

  .cn-rich-composer::backdrop {
    background: var(--cn-backdrop);
  }

  /* Mobile: full-screen sheet */
  @media (max-width: 767px) {
    .cn-rich-composer {
      width: 100%;
      max-width: 100%;
      height: 100%;
      max-height: 100%;
      border-radius: 0;
      inset: 0;
      margin: 0;
    }
  }

  /* ---- Drag overlay ---- */
  .cn-rich-composer__drop-overlay {
    display: none;
    position: absolute;
    inset: 0;
    z-index: var(--cn-z-dialog-overlay);
    background: color-mix(in srgb, var(--cn-surface-1) 80%, transparent);
    border: 2px dashed var(--cn-border);
    border-radius: var(--cn-border-radius-medium);
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .cn-rich-composer__drop-overlay--visible {
    display: flex;
  }

  .cn-rich-composer__drop-label {
    font-size: 1.125rem;
    color: var(--cn-text);
    pointer-events: none;
  }

  /* ---- Header ---- */
  .cn-rich-composer__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--cn-grid) calc(var(--cn-grid) * 2);
    border-bottom: 1px solid var(--cn-border);
    background: var(--cn-surface-2);
    flex-shrink: 0;
  }

  .cn-rich-composer__tabs {
    display: flex;
    gap: calc(var(--cn-grid) / 2);
  }

  .cn-rich-composer__tab {
    padding: var(--cn-grid) calc(var(--cn-grid) * 1.5);
    border: none;
    background: transparent;
    color: var(--cn-text);
    cursor: pointer;
    border-radius: var(--cn-border-radius-small);
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.65;
    transition: opacity 0.1s;
  }

  .cn-rich-composer__tab:hover {
    opacity: 1;
    background: var(--cn-hover);
  }

  .cn-rich-composer__tab--active {
    opacity: 1;
    background: var(--cn-surface-1);
    border-bottom: 2px solid currentColor;
  }

  .cn-rich-composer__tab:focus-visible {
    outline: 2px solid var(--cn-focus-ring);
    outline-offset: 2px;
  }

  .cn-rich-composer__close {
    border: none;
    background: transparent;
    color: var(--cn-text);
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    padding: var(--cn-grid);
    border-radius: var(--cn-border-radius-small);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cn-rich-composer__close:hover {
    background: var(--cn-hover);
  }

  .cn-rich-composer__close:focus-visible {
    outline: 2px solid var(--cn-focus-ring);
    outline-offset: 2px;
  }

  /* ---- Toolbar ---- */
  .cn-rich-composer__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--cn-grid) / 2);
    padding: var(--cn-grid) calc(var(--cn-grid) * 2);
    border-bottom: 1px solid var(--cn-border);
    background: var(--cn-surface-2);
    flex-shrink: 0;
  }

  .cn-rich-composer__format-btn {
    padding: calc(var(--cn-grid) * 0.5) var(--cn-grid);
    border: 1px solid var(--cn-border);
    background: var(--cn-surface-1);
    color: var(--cn-text);
    cursor: pointer;
    border-radius: var(--cn-border-radius-small);
    font-family: monospace;
    font-size: 0.8125rem;
    min-width: calc(var(--cn-grid) * 4);
    text-align: center;
  }

  .cn-rich-composer__format-btn:hover:not(:disabled) {
    background: var(--cn-hover);
  }

  .cn-rich-composer__format-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .cn-rich-composer__format-btn:focus-visible {
    outline: 2px solid var(--cn-focus-ring);
    outline-offset: 2px;
  }

  /* ---- Body ---- */
  .cn-rich-composer__body {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .cn-rich-composer__editor-host {
    flex: 1;
    min-height: 200px;
    display: flex;
    flex-direction: column;
  }

  /* Let CodeMirror fill the host */
  .cn-rich-composer__editor-host :global(.cn-editor-host) {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .cn-rich-composer__editor-host :global(.cm-editor) {
    flex: 1;
    min-height: 200px;
  }

  .cn-rich-composer__preview {
    padding: calc(var(--cn-grid) * 2);
    color: var(--cn-text);
    min-height: 200px;
    overflow: auto;
    line-height: 1.6;
  }

  .cn-rich-composer__preview-loading {
    color: var(--cn-text);
    opacity: 0.5;
  }

  /* ---- Attachments ---- */
  .cn-rich-composer__attachments {
    list-style: none;
    margin: 0;
    padding: var(--cn-grid) calc(var(--cn-grid) * 2);
    border-top: 1px solid var(--cn-border);
    display: flex;
    flex-direction: column;
    gap: calc(var(--cn-grid) / 2);
    flex-shrink: 0;
    max-height: 120px;
    overflow-y: auto;
  }

  .cn-rich-composer__attachment {
    display: flex;
    align-items: center;
    gap: var(--cn-grid);
    padding: calc(var(--cn-grid) * 0.5) var(--cn-grid);
    border-radius: var(--cn-border-radius-small);
    background: var(--cn-surface-2);
    font-size: 0.8125rem;
  }

  .cn-rich-composer__attachment--error {
    background: color-mix(in srgb, var(--cn-color-error) 10%, var(--cn-surface-2));
  }

  .cn-rich-composer__attachment-thumb {
    width: calc(var(--cn-grid) * 4);
    height: calc(var(--cn-grid) * 4);
    object-fit: cover;
    border-radius: var(--cn-border-radius-small);
    flex-shrink: 0;
  }

  .cn-rich-composer__attachment-name {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--cn-text);
  }

  .cn-rich-composer__attachment-size {
    color: var(--cn-text);
    opacity: 0.6;
    flex-shrink: 0;
  }

  .cn-rich-composer__attachment-status {
    flex-shrink: 0;
    font-size: 0.75rem;
  }

  .cn-rich-composer__attachment-status--error {
    color: var(--cn-color-error);
  }

  .cn-rich-composer__attachment-status--success {
    color: var(--cn-color-success);
  }

  /* ---- Footer ---- */
  .cn-rich-composer__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--cn-grid);
    padding: calc(var(--cn-grid) * 1.5) calc(var(--cn-grid) * 2);
    border-top: 1px solid var(--cn-border);
    background: var(--cn-surface-2);
    flex-shrink: 0;
  }

  .cn-rich-composer__cancel,
  .cn-rich-composer__save {
    padding: var(--cn-grid) calc(var(--cn-grid) * 2);
    border-radius: var(--cn-border-radius-small);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid var(--cn-border);
  }

  .cn-rich-composer__cancel {
    background: transparent;
    color: var(--cn-text);
  }

  .cn-rich-composer__cancel:hover:not(:disabled) {
    background: var(--cn-hover);
  }

  .cn-rich-composer__cancel:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .cn-rich-composer__save {
    background: var(--cn-text);
    color: var(--cn-surface-1);
    border-color: var(--cn-text);
    display: flex;
    align-items: center;
    gap: calc(var(--cn-grid) / 2);
  }

  .cn-rich-composer__save:hover:not(:disabled) {
    opacity: 0.85;
  }

  .cn-rich-composer__save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cn-rich-composer__cancel:focus-visible,
  .cn-rich-composer__save:focus-visible {
    outline: 2px solid var(--cn-focus-ring);
    outline-offset: 2px;
  }

  .cn-rich-composer__saving-indicator {
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>
