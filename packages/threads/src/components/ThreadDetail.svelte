<script lang="ts">
import type { Thread } from "../schemas/ThreadSchema";

let {
  thread,
  bodyHtml,
}: {
  thread: Thread;
  bodyHtml: string;
} = $props();

const posterUrl = $derived(
  thread.poster
    ? thread.poster
    : thread.images && thread.images.length > 0
      ? thread.images[0]?.url
      : undefined,
);

const channelSlug = $derived(thread.channel.toLowerCase().replace(/\s+/g, "-"));

const isAnonymous = $derived(!thread.author || thread.author === "-");
</script>

<article lang={thread.locale}>
  <h1>{thread.title}</h1>
  <p><a href={`/channels/${channelSlug}`}>{thread.channel}</a></p>
  <p>{isAnonymous ? "anonymous" : thread.author}</p>
  {#if posterUrl}
    <img src={posterUrl} alt={thread.title} />
  {/if}
  <section>{@html bodyHtml}</section>
</article>
