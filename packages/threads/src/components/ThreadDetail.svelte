<script lang="ts">
import CnLightbox from "@cyan/components/CnLightbox.svelte";
import type { Thread } from "../schemas/ThreadSchema";

let {
  thread,
  bodyHtml,
}: {
  thread: Thread;
  bodyHtml: string;
} = $props();

const coverImages = $derived.by(() => {
  const mapped = (thread.images ?? []).map(({ url, alt }) => ({ src: url, caption: alt }));
  if (thread.poster && !mapped.some((img) => img.src === thread.poster)) {
    return [{ src: thread.poster, caption: thread.title }, ...mapped];
  }
  return mapped;
});
</script>

<article lang={thread.locale}>
  <h1>{thread.title}</h1>
  <CnLightbox images={coverImages} />
  <section>{@html bodyHtml}</section>
</article>
