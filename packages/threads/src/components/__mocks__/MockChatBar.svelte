<script lang="ts">
// Minimal CnChatBar mock for unit tests.
// Exposes a text input and a send button with test IDs.
let {
  value = $bindable(""),
  disabled = false,
  onsend,
}: {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onsend?: (value: string) => void;
} = $props();

function handleSend() {
  onsend?.(value);
}
</script>

<div data-testid="cn-chat-bar">
  <input
    data-testid="mock-chat-input"
    bind:value
    {disabled}
  />
  <button
    type="button"
    data-testid="mock-send-btn"
    onclick={handleSend}
    {disabled}
  >Send</button>
</div>
