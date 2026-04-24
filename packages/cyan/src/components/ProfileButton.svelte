<script lang="ts">
import CnAvatar from "./CnAvatar.svelte";
import CnIcon from "./CnIcon.svelte";

interface Props {
  loading?: boolean;
  nick?: string | null;
  photoURL?: string | null;
  loginHref?: string;
  settingsHref?: string;
}

let {
  loading = false,
  nick = null,
  photoURL = null,
  loginHref = "/login",
  settingsHref = "/settings",
}: Props = $props();
</script>

{#if loading}
  <div class="cn-profile-button cn-profile-button--loading" aria-hidden="true">
    <div class="cn-profile-button__skeleton"></div>
  </div>
{:else if nick}
  <a href={settingsHref} class="cn-profile-button cn-profile-button--authenticated" aria-label="Settings">
    <CnAvatar {nick} src={photoURL || undefined} size="medium" />
  </a>
{:else}
  <a href={loginHref} class="cn-profile-button cn-profile-button--anonymous" aria-label="Log in">
    <div class="cn-profile-button__icon-wrapper">
      <CnIcon noun="login" size="medium" />
    </div>
  </a>
{/if}

<style>
  .cn-profile-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--cn-line) * 2); /* 48px medium */
    height: calc(var(--cn-line) * 2);
    border-radius: 50%;
    text-decoration: none;
    color: inherit;
    position: relative;
    outline: none;
    transition: background-color 0.2s ease;
  }

  .cn-profile-button:focus-visible {
    box-shadow: 0 0 0 2px var(--cn-link);
  }

  .cn-profile-button--anonymous .cn-profile-button__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: var(--cn-surface-1);
    transition: background-color 0.2s ease;
  }

  .cn-profile-button--anonymous:hover .cn-profile-button__icon-wrapper {
    background-color: var(--cn-hover);
  }

  /* Authenticated hover */
  .cn-profile-button--authenticated::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background-color: transparent;
    transition: background-color 0.2s ease;
    pointer-events: none;
  }

  .cn-profile-button--authenticated:hover::after {
    background-color: var(--cn-hover);
  }

  /* Skeleton Loading */
  .cn-profile-button__skeleton {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: var(--cn-surface-2);
    animation: pulse 1.5s infinite ease-in-out;
  }

  @keyframes pulse {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
</style>
