<script lang="ts">
interface Props {
  appName: string;
}

const { appName }: Props = $props();
</script>

<nav class="top-nav">
  <a href="/" class="brand">{appName}</a>
</nav>

<style>
  .top-nav {
    display: flex;
    align-items: center;
    padding: var(--cyan-space-sm) var(--cyan-space-md);
    background-color: var(--cyan-surface);
    border-bottom: 1px solid var(--cyan-outline-variant);
  }

  .brand {
    font-size: var(--cyan-font-size-lg);
    font-weight: var(--cyan-font-weight-bold);
    color: var(--cyan-primary);
    text-decoration: none;
  }
</style>
