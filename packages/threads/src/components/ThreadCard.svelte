<script lang="ts">
import CnCard from "@cyan/components/CnCard.svelte";
import { ProfileLink } from "@pelilauta/profiles/components";
import type { Profile } from "@pelilauta/profiles/server";
import type { Thread } from "../schemas/ThreadSchema";

let {
  thread,
  snippet,
  coverUrl,
  channelSlug,
  channelLinkLabel,
  channelIcon,
  authorProfile = null,
  anonymousLabel,
}: {
  thread: Thread;
  snippet?: string;
  coverUrl?: string;
  channelSlug: string;
  channelLinkLabel: string;
  channelIcon?: string;
  authorProfile?: Profile | null;
  anonymousLabel: string;
} = $props();
</script>

<div lang={thread.locale}>
  <CnCard
    href={`/threads/${thread.key}`}
    title={thread.title}
    cover={coverUrl}
    noun={channelIcon}
    elevation={1}
  >
    {#snippet eyebrow()}
      <a href={`/channels/${channelSlug}`}>{channelLinkLabel}</a>
    {/snippet}
    {#if snippet}
      <p>{snippet}</p>
    {/if}
    <p><ProfileLink profile={authorProfile} {anonymousLabel} /></p>
  </CnCard>
</div>
