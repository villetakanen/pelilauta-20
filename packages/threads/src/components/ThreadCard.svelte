<script lang="ts">
import CnCard from "@cyan/components/CnCard.svelte";
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

const snippet = $derived(plainSnippet(thread.markdownContent || "", 220));

const channelSlug = $derived(thread.channel.toLowerCase().replace(/\s+/g, "-"));

function plainSnippet(markdown: string, maxLength: number): string {
  if (!markdown.trim()) return "";

  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\n\n+/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;

  const truncated = plain.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cutPoint = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;
  return `${truncated.substring(0, cutPoint)}\u2026`;
}
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
