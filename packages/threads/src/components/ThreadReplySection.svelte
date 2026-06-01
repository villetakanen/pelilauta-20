<script lang="ts">
// ThreadReplySection — Svelte 5 island that owns ThreadReplies + ReplyForm.
//
// Lifts `entries` state so that both the realtime listener (ThreadReplies) and
// the optimistic append flow (ReplyForm) share a single source of truth.
//
// Host wiring: the Astro host renders this island (client:idle for authenticated
// viewers) and passes initialReplies + all the same props that ThreadReplies
// accepted directly. The anonymous branch still renders a plain <ThreadReplies>
// with no client: directive.
//
// See specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Host Page DoD
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Anonymous viewers see a login CTA in place of the form

import ReplyForm from "./ReplyForm.svelte";
import ThreadReplies from "./ThreadReplies.svelte";
import type { ReplyEntry } from "./types";

// Structural type for the methods exposed via bind:this. We avoid
// `let repliesRef: ThreadReplies` because Biome's useImportType rule sees the
// component identifier only in type position and silently rewrites the import
// to `import type ThreadReplies`, which elides the value binding the template
// needs and breaks Astro SSR at runtime. Typing structurally keeps the import
// purely value-form (referenced only in the template below) so the lint rule
// has nothing to demote.
type RepliesRef = {
  appendReply: (entry: ReplyEntry & { _replaceKey?: string }) => void;
  removeReply: (key: string) => void;
};

interface Props {
  threadKey: string;
  initialReplies: Array<ReplyEntry>;
  currentUid: string;
  targetFlowTime?: number;
  emptyLabel?: string;
  /** Pre-resolved i18n strings for the embedded ReplyForm. Resolved at SSR
   * by the host because translator functions cannot serialize across the
   * Astro island boundary (they arrive as null after hydration). */
  placeholderText: string;
  frozenNoticeText: string;
  errorText: string;
}

const {
  threadKey,
  initialReplies,
  currentUid,
  targetFlowTime,
  emptyLabel,
  placeholderText,
  frozenNoticeText,
  errorText,
}: Props = $props();

// We expose appendReply/removeReply to bridge the two components via bind:this.
let repliesRef: RepliesRef | undefined = $state();

function handleReplyAppended(entry: ReplyEntry & { _replaceKey?: string }) {
  repliesRef?.appendReply(entry);
}

function handleReplyRemoved(key: string) {
  repliesRef?.removeReply(key);
}
</script>

<ThreadReplies
  bind:this={repliesRef}
  {threadKey}
  {initialReplies}
  {currentUid}
  {targetFlowTime}
  {emptyLabel}
/>
<ReplyForm
  {threadKey}
  {placeholderText}
  {frozenNoticeText}
  {errorText}
  onReplyAppended={handleReplyAppended}
  onReplyRemoved={handleReplyRemoved}
/>
