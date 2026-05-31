<script lang="ts">
import type { AttachmentItem } from "@pelilauta/cyan-editor";
import CnRichComposer from "@pelilauta/cyan-editor/svelte-rich-composer";

interface Props {
  initialValue?: string;
  label?: string;
  showDummyAttachments?: boolean;
}

let {
  initialValue = "# Hello\n\nWrite a **reply** here.\n\n- item 1\n- item 2",
  label = "Rich Composer",
  showDummyAttachments = false,
}: Props = $props();

let open = $state(false);
let value = $state(initialValue);
let log = $state<string[]>([]);

const dummyAttachments: AttachmentItem[] = showDummyAttachments
  ? [
      { id: "f1", name: "screenshot.png", size: 204800, status: "uploading", progress: 65 },
      { id: "f2", name: "diagram.pdf", size: 512000, status: "success" },
      { id: "f3", name: "broken.jpg", size: 8192, status: "error" },
    ]
  : [];

function onsave() {
  log = [...log, `Saved at ${new Date().toLocaleTimeString()}: ${value.slice(0, 60)}…`];
  open = false;
}

function oncancel() {
  log = [...log, `Cancelled at ${new Date().toLocaleTimeString()}`];
  open = false;
}

function onupload(files: File[]) {
  log = [
    ...log,
    `Upload triggered with ${files.length} file(s): ${files.map((f) => f.name).join(", ")}`,
  ];
}
</script>

<section class="cn-rich-composer-demo">
  <header class="cn-rich-composer-demo__header">
    <span class="text-medium">{label}</span>
  </header>

  <button
    type="button"
    class="cn-rich-composer-demo__open-btn"
    onclick={() => (open = true)}
  >
    Open Composer
  </button>

  <CnRichComposer
    bind:open
    bind:value
    placeholder="Write a detailed reply…"
    attachments={dummyAttachments}
    {onsave}
    {oncancel}
    {onupload}
  />

  <details class="cn-rich-composer-demo__log">
    <summary>Activity log ({log.length})</summary>
    {#if log.length === 0}
      <p class="cn-rich-composer-demo__empty">No activity yet. Open the composer and interact.</p>
    {:else}
      <ol>
        {#each log as entry, i (i)}
          <li><pre>{entry}</pre></li>
        {/each}
      </ol>
    {/if}
  </details>
</section>

<style>
  .cn-rich-composer-demo {
    display: flex;
    flex-direction: column;
    gap: var(--cn-gap);
    margin: var(--cn-gap) 0;
  }

  .cn-rich-composer-demo__header {
    display: flex;
    align-items: center;
    gap: var(--cn-gap);
  }

  .cn-rich-composer-demo__open-btn {
    padding: var(--cn-grid) calc(var(--cn-grid) * 2);
    border: 1px solid var(--cn-border);
    border-radius: var(--cn-border-radius-small);
    background: var(--cn-surface-1);
    color: var(--cn-text);
    cursor: pointer;
    font-size: 0.875rem;
    align-self: flex-start;
  }

  .cn-rich-composer-demo__open-btn:hover {
    background: var(--cn-hover);
  }

  .cn-rich-composer-demo__log ol {
    margin: var(--cn-grid) 0 0;
    padding-left: calc(var(--cn-gap) * 1.5);
  }

  .cn-rich-composer-demo__log pre {
    white-space: pre-wrap;
    word-break: break-word;
    background: var(--cn-surface-2);
    padding: var(--cn-grid) var(--cn-gap);
    border-radius: var(--cn-border-radius-medium);
    margin: 0;
  }

  .cn-rich-composer-demo__empty {
    color: var(--cn-text-low);
    margin: var(--cn-grid) 0 0;
  }
</style>
