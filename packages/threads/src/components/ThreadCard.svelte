<script lang="ts">
import CnCard from "@cyan/components/CnCard.svelte";
import CnIcon from "@cyan/components/CnIcon.svelte";
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
  dateLabel,
}: {
  thread: Thread;
  snippet?: string;
  coverUrl?: string;
  channelSlug: string;
  channelLinkLabel: string;
  channelIcon?: string;
  authorProfile?: Profile | null;
  anonymousLabel: string;
  dateLabel: string;
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
    {#snippet actions()}
      <p><ProfileLink profile={authorProfile} {anonymousLabel} /><br />{dateLabel}</p>
      <a href={`/threads/${thread.key}`}><CnIcon noun="discussion" /><span>{thread.replyCount ?? 0}</span></a>
    {/snippet}
  </CnCard>
</div>
