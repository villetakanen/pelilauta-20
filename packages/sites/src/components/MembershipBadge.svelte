<script lang="ts">
import CnIcon from "@cyan/components/CnIcon.svelte";
import { uid } from "@pelilauta/auth/client";

interface Props {
  owners: readonly string[];
  players: readonly string[];
}

const { owners, players }: Props = $props();

const role = $derived.by(() => {
  if (!$uid) return "none";
  if (owners.includes($uid)) return "owner";
  if (players.includes($uid)) return "player";
  return "none";
});
</script>

{#if role === "owner"}
  <CnIcon noun="avatar" size="small" />
{:else if role === "player"}
  <CnIcon noun="meeple" size="small" />
{/if}
