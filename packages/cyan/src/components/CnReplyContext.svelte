<script lang="ts">
import CnAvatar from "./CnAvatar.svelte";
import CnIcon from "./CnIcon.svelte";

let {
  user,
  avatarUrl,
  text,
  ondismiss,
}: {
  user: string;
  avatarUrl?: string;
  text: string;
  ondismiss?: () => void;
} = $props();
</script>

<div class="cn-reply-context">
  <CnAvatar src={avatarUrl} nick={user} size="small" aria-hidden="true" />
  <span class="cn-reply-context__username">@{user}</span>
  <span class="cn-reply-context__snippet">{text}</span>
  <button
    type="button"
    class="cn-reply-context__dismiss"
    aria-label={`Dismiss reply to @${user}`}
    onclick={() => ondismiss?.()}
  >
    <CnIcon noun="close" size="small" />
  </button>
</div>

<style>
  .cn-reply-context {
    display: flex;
    align-items: center;
    gap: var(--cn-grid);
    padding: var(--cn-grid) calc(var(--cn-grid) * 1.5);
    background: var(--cn-reply-context-bg);
    color: var(--cn-reply-context-text);
    border-radius: var(--cn-border-radius-medium);
    min-width: 0;
  }

  .cn-reply-context__username {
    font-weight: 600;
    flex-shrink: 0;
    color: var(--cn-reply-context-text);
  }

  .cn-reply-context__snippet {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--cn-reply-context-text);
    opacity: 0.8;
  }

  .cn-reply-context__dismiss {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--cn-grid);
    border: none;
    background: transparent;
    color: var(--cn-reply-context-text);
    cursor: pointer;
    border-radius: var(--cn-border-radius-small);
    line-height: 1;
  }

  .cn-reply-context__dismiss:hover {
    background: var(--cn-hover);
  }

  .cn-reply-context__dismiss:focus-visible {
    outline: 2px solid var(--cn-focus-ring);
    outline-offset: 2px;
  }
</style>
