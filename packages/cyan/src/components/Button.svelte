<script lang="ts">
interface Props {
  label: string;
  variant?: "primary" | "outline" | "ghost";
  disabled?: boolean;
  onclick?: () => void;
}

const { label, variant = "primary", disabled = false, onclick }: Props = $props();
</script>

<button class="cyan-button" class:primary={variant === "primary"} class:outline={variant === "outline"} class:ghost={variant === "ghost"} {disabled} {onclick}>
  {label}
</button>

<style>
  .cyan-button {
    font-family: var(--cyan-font-family);
    font-size: var(--cyan-font-size-sm);
    font-weight: var(--cyan-font-weight-medium);
    line-height: var(--cyan-line-height-normal);
    padding: var(--cyan-space-sm) var(--cyan-space-md);
    border-radius: var(--cyan-radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }

  .cyan-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .primary {
    background-color: var(--cyan-primary);
    color: var(--cyan-on-primary);
  }

  .primary:hover:not(:disabled) {
    background-color: var(--cyan-primary-dark);
  }

  .outline {
    background-color: transparent;
    color: var(--cyan-primary);
    border-color: var(--cyan-primary);
  }

  .outline:hover:not(:disabled) {
    background-color: var(--cyan-primary);
    color: var(--cyan-on-primary);
  }

  .ghost {
    background-color: transparent;
    color: var(--cyan-on-surface);
    border-color: transparent;
  }

  .ghost:hover:not(:disabled) {
    background-color: var(--cyan-surface-dim);
  }
</style>
