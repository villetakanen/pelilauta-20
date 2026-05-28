<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { type CnEditorHandle, createCnEditor } from "./createCnEditor";

interface Props {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  gutter?: boolean;
  dark?: boolean;
  name?: string;
  class?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
}

let {
  value = $bindable(""),
  placeholder = "",
  disabled = false,
  gutter = false,
  dark,
  name,
  class: className = "",
  onChange,
  onBlur,
}: Props = $props();

let target: HTMLDivElement | undefined = $state();
let handle: CnEditorHandle | undefined;

onMount(() => {
  if (!target) return;
  handle = createCnEditor(target, {
    value,
    placeholder,
    disabled,
    gutter,
    dark,
    onChange: (next) => {
      value = next;
      onChange?.(next);
    },
    onBlur,
  });
});

onDestroy(() => {
  handle?.destroy();
  handle = undefined;
});

$effect(() => {
  if (!handle) return;
  if (value !== handle.getValue()) handle.setValue(value);
});
$effect(() => {
  handle?.setPlaceholder(placeholder);
});
$effect(() => {
  handle?.setDisabled(disabled);
});
$effect(() => {
  handle?.setGutter(gutter);
});
</script>

<div bind:this={target} class={`cn-editor-host ${className}`}>
  {#if name !== undefined}
    <input type="hidden" {name} {value} />
  {/if}
</div>
