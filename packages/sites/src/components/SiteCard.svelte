<script lang="ts">
import CnCard from "@cyan/components/CnCard.svelte";
import MembershipBadge from "./MembershipBadge.svelte";

interface SiteCardProps {
  // Identity / link
  key: string;
  name: string;
  description?: string;

  // System (eyebrow link + icon)
  systemNoun: string;
  systemLabel: string;
  systemHref: string;

  // Cover image
  coverUrl?: string;
  coverSrcset?: string;
  coverSizes?: string;

  // Footer
  dateLabel: string;

  // Membership badge
  isAuthenticated: boolean;
  owners: readonly string[];
  players: readonly string[];
}

const {
  key,
  name,
  description,
  systemNoun,
  systemLabel,
  systemHref,
  coverUrl,
  coverSrcset,
  coverSizes,
  dateLabel,
  isAuthenticated,
  owners,
  players,
}: SiteCardProps = $props();
</script>

<CnCard
  title={name}
  href={`/sites/${key}`}
  cover={coverUrl}
  srcset={coverSrcset}
  sizes={coverSizes}
  {description}
  noun={systemNoun}
>
  {#snippet eyebrow()}
    <a href={systemHref}>{systemLabel}</a>
  {/snippet}

  {#snippet actions()}
    <p>{dateLabel}</p>
    {#if isAuthenticated}
      <MembershipBadge {owners} {players} />
    {/if}
  {/snippet}
</CnCard>
