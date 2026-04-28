<script lang="ts">
import CnCard from "@cyan/components/CnCard.svelte";
import { markdownToPlainText } from "@pelilauta/utils/markdownToPlainText";
import type { Thread } from "../schemas/ThreadSchema";

let {
  thread,
  noun,
}: {
  thread: Thread;
  noun?: string;
} = $props();

const posterUrl = $derived(
  thread.poster
    ? thread.poster
    : thread.images && thread.images.length > 0
      ? thread.images[0]?.url
      : undefined,
);

const snippet = $derived(markdownToPlainText(thread.markdownContent || "", 220));

const channelSlug = $derived(thread.channel.toLowerCase().replace(/\s+/g, "-"));
</script>

<div lang={thread.locale}>
  <CnCard
    href={`/threads/${thread.key}`}
    title={thread.title}
    cover={posterUrl}
    {noun}
    elevation={1}
  >
    <p><a href={`/channels/${channelSlug}`}>{thread.channel}</a></p>
    {#if snippet}
      <p>{snippet}</p>
    {/if}
  </CnCard>
</div>
