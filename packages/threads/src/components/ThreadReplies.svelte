<script lang="ts">
// ThreadReplies — SSR seed list + CSR auth-gated realtime listener + scroll-to-target.
//
// SSR renders directly from initialReplies (no store read, no JS).
// After hydration: seeds the shared replyEntriesStore for this threadKey
// (idempotent; the first island to hydrate wins) and subscribes to it for
// reactive updates. The realtime listener writes diffs into the same store.
// The form island writes optimistic entries into the same store.
//
// See specs/pelilauta/threads/detail-page/replies/spec.md
// §Anonymous viewer receives the full reply list in SSR
// §Authenticated viewer sees new replies appear without reload
// §?since={flowTime} scrolls to the first matching reply
// §Own replies render with the reply bubble variant
// §Native #reply-{key} fragment jumps to a reply without JavaScript

import type { SessionState } from "@pelilauta/auth/client";
import { sessionState, uid } from "@pelilauta/auth/client";
import { onMount, tick, untrack } from "svelte";
import { getStore, mergeListenerDiff, seedEntries } from "../client/replyEntriesStore";
import { subscribeReplies } from "../client/subscribeReplies";
import type { Reply } from "../schemas/ReplySchema";
import ReplyArticle from "./ReplyArticle.svelte";
import type { ReplyEntry } from "./types";

let {
  threadKey,
  initialReplies,
  currentUid = null,
  targetFlowTime,
  emptyLabel = "No replies yet.",
}: {
  threadKey: string;
  initialReplies: Array<ReplyEntry>;
  currentUid?: string | null;
  targetFlowTime?: number;
  emptyLabel?: string;
} = $props();

// CSR reactive auth state — subscribed in onMount.
let liveUid = $state<string | null>(null);
let liveSessionState = $state<SessionState>("initial");

// Live entries: SSR seeds from initialReplies (untrack avoids a reactive
// dependency on the prop; we want a one-time seed). CSR mirrors the shared
// store into local $state via the onMount subscription.
let entries = $state<Array<ReplyEntry>>(untrack(() => [...initialReplies]));

let scrollFired = $state(false);

const resolvedUid = $derived(liveUid ?? currentUid);

function isFromUser(reply: Reply): boolean {
  return resolvedUid != null && reply.owners[0] === resolvedUid;
}

onMount(() => {
  // Seed the shared store once for this threadKey, then mirror it locally.
  seedEntries(threadKey, initialReplies);
  const store = getStore(threadKey);
  entries = store.get();

  const unsubEntries = store.subscribe((value) => {
    entries = value;
  });
  const unsubUid = uid.subscribe((value) => {
    liveUid = value;
  });
  const unsubSession = sessionState.subscribe((value) => {
    liveSessionState = value;
  });

  return () => {
    unsubEntries();
    unsubUid();
    unsubSession();
  };
});

// Realtime listener: mount when authenticated, tear down otherwise.
$effect(() => {
  const currentLiveUid = liveUid;
  const currentLiveSession = liveSessionState;

  if (currentLiveUid != null && currentLiveSession === "active") {
    const unsubscribe = subscribeReplies(threadKey, (diff) => {
      mergeListenerDiff(threadKey, diff);
    });
    return unsubscribe;
  }
});

// Scroll to first reply at-or-after targetFlowTime, once per mount.
$effect(() => {
  if (scrollFired || targetFlowTime == null) return;

  const currentEntries = entries;
  scrollFired = true;

  tick().then(() => {
    const target = currentEntries.find(
      (e) => targetFlowTime != null && e.reply.flowTime >= targetFlowTime,
    );
    if (target) {
      const el = document.getElementById(target.reply.key);
      if (el) {
        el.scrollIntoView();
      }
    }
  });
});
</script>

{#if entries.length === 0}
  <p>{emptyLabel}</p>
{:else}
  {#each entries as entry (entry.reply.key)}
    <ReplyArticle
      reply={entry.reply}
      bodyHtml={entry.bodyHtml}
      profile={entry.profile}
      fromUser={isFromUser(entry.reply)}
    />
  {/each}
{/if}
