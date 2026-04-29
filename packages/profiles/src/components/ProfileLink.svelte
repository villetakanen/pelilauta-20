<script lang="ts">
import type { Profile } from "../server/schemas";

let {
  profile,
  anonymousLabel = "Anonymous",
}: {
  profile?: Profile | null;
  anonymousLabel?: string;
} = $props();
</script>

{#if profile}
  <a href={`/profiles/${profile.key}`}>{profile.nick}</a>
{:else}
  <span>{anonymousLabel}</span>
{/if}
