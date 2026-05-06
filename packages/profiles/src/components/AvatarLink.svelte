<script lang="ts">
import CnAvatar from "@cyan/components/CnAvatar.svelte";
import type { Profile } from "../server/schemas";

let {
  profile,
  size = "small",
}: {
  profile?: Profile | null;
  size?: "small" | "medium";
} = $props();
</script>

{#if profile}
  <a href={`/profiles/${profile.key}`} aria-label={profile.nick}>
    <CnAvatar nick={profile.nick} src={profile.avatarURL} {size} />
  </a>
{:else}
  <CnAvatar {size} aria-hidden="true" />
{/if}
