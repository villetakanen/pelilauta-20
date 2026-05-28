<script lang="ts">
import CnEditor from "@pelilauta/cyan-editor/svelte";

interface Props {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  gutter?: boolean;
  showPreview?: boolean;
  showStateToggles?: boolean;
  label?: string;
}

let {
  value = "",
  placeholder = "Write markdown...",
  disabled = false,
  gutter = false,
  showPreview = true,
  showStateToggles = false,
  label = "Editor",
}: Props = $props();

let current = $state(value);
let isDisabled = $state(disabled);
let isGutter = $state(gutter);
</script>

<section class="cyan-editor-demo">
  <header class="cyan-editor-demo__header">
    <span class="cyan-editor-demo__label text-medium">{label}</span>
    {#if showStateToggles}
      <div class="cyan-editor-demo__toggles">
        <button type="button" onclick={() => (isDisabled = !isDisabled)}>
          {isDisabled ? "Enable" : "Disable"}
        </button>
        <button type="button" onclick={() => (isGutter = !isGutter)}>
          {isGutter ? "Hide gutter" : "Show gutter"}
        </button>
      </div>
    {/if}
  </header>

  <CnEditor
    bind:value={current}
    {placeholder}
    disabled={isDisabled}
    gutter={isGutter}
  />

  {#if showPreview}
    <details class="cyan-editor-demo__preview">
      <summary>Current value ({current.length} chars)</summary>
      <pre>{current}</pre>
    </details>
  {/if}
</section>

<style>
  .cyan-editor-demo {
    display: flex;
    flex-direction: column;
    gap: var(--cn-gap);
    margin: var(--cn-gap) 0;
  }
  .cyan-editor-demo__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--cn-gap);
  }
  .cyan-editor-demo__toggles {
    display: flex;
    gap: calc(var(--cn-gap) / 2);
  }
  .cyan-editor-demo__preview pre {
    white-space: pre-wrap;
    word-break: break-word;
    background: var(--cn-surface-2);
    padding: var(--cn-gap);
    border-radius: var(--cn-border-radius-field, 0.25rem);
  }
</style>
