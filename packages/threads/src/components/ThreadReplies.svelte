<script lang="ts">
// ThreadReplies — SSR seed list + CSR auth-gated realtime listener + scroll-to-target.
//
// SSR renders the seed list synchronously from initialReplies. After hydration
// the auth gate (uid atom, sessionState atom from @pelilauta/auth/client) is
// checked: when uid is non-null and sessionState is "active", subscribeReplies
// is called and its diffs are merged into the rendered list. Scroll-to-target
// fires once per mount after tick().
//
// See specs/pelilauta/threads/detail-page/replies/spec.md
// §ThreadReplies SSR-renders every initialReply with id={reply.key}
// §ThreadReplies mounts the realtime listener only when authenticated
// §ThreadReplies merges a docChanges diff into the rendered list
// §ThreadReplies scrolls to the first reply at-or-after targetFlowTime
// §ThreadReplies does not scroll when no reply matches targetFlowTime
// §Anonymous SSR response is uid-independent and listener-free
// §Authenticated SSR resolves fromUser from currentUid
// §ThreadReplies recomputes fromUser when the auth atom resolves
// §Native #reply-{key} fragment scrolls without component logic

import type { SessionState } from "@pelilauta/auth/client";
import { sessionState, uid } from "@pelilauta/auth/client";
import { onMount, tick, untrack } from "svelte";
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

// --- CSR reactive auth state ---
// We subscribe to nanostores atoms manually and mirror into $state for reactivity.
let liveUid = $state<string | null>(null);
let liveSessionState = $state<SessionState>("initial");

// Live reply list seeded from SSR. The listener merges diffs into this.
// untrack() captures the initial prop value without creating a reactive dependency —
// this is intentional: we want a one-time seed, not a live derived.
let entries = $state<Array<ReplyEntry>>(untrack(() => [...initialReplies]));

// Scroll-to-target guard — fires once per mount.
let scrollFired = $state(false);

/**
 * Append a new entry or replace an existing one (identified by _replaceKey).
 * Called by external consumers such as ReplyForm for optimistic appends.
 * Export allows the host to obtain a reference via bind:this and call imperative.
 */
export function appendReply(entry: ReplyEntry & { _replaceKey?: string }): void {
  if (entry._replaceKey) {
    const { _replaceKey, ...clean } = entry;
    const idx = entries.findIndex((e) => e.reply.key === _replaceKey);
    if (idx !== -1) {
      entries = entries.map((e, i) => (i === idx ? clean : e));
    } else {
      // Provisional not found (maybe already reconciled by listener) — just append
      entries = [...entries, clean];
    }
  } else {
    // Dedup: skip if key already present
    const exists = entries.some((e) => e.reply.key === entry.reply.key);
    if (!exists) {
      entries = [...entries, entry];
    }
  }
}

/**
 * Remove an entry by reply key. Called by ReplyForm to roll back a failed
 * optimistic provisional.
 */
export function removeReply(key: string): void {
  entries = entries.filter((e) => e.reply.key !== key);
}

// fromUser resolution: SSR uses currentUid; CSR uses liveUid once hydrated.
// Uses $derived to recompute reactively when liveUid changes.
const resolvedUid = $derived(liveUid ?? currentUid);

function isFromUser(reply: Reply): boolean {
  return resolvedUid != null && reply.owners[0] === resolvedUid;
}

onMount(() => {
  // Mirror nanostores atoms into local $state so $derived and $effect react.
  const unsubUid = uid.subscribe((value) => {
    liveUid = value;
  });
  const unsubSession = sessionState.subscribe((value) => {
    liveSessionState = value;
  });

  return () => {
    unsubUid();
    unsubSession();
  };
});

// Listener lifecycle: mount when uid is set + session active, tear down otherwise.
// The $effect re-runs whenever liveUid or liveSessionState changes.
$effect(() => {
  // Accessing reactive state to key the effect
  const currentLiveUid = liveUid;
  const currentLiveSession = liveSessionState;

  if (currentLiveUid != null && currentLiveSession === "active") {
    const unsubscribe = subscribeReplies(threadKey, (diff) => {
      // Apply added: append new entries (no profile/bodyHtml available CSR-side)
      for (const addedReply of diff.added) {
        const exists = entries.some((e) => e.reply.key === addedReply.key);
        if (!exists) {
          entries = [...entries, { reply: addedReply, bodyHtml: "", profile: null }];
        }
      }

      // Apply modified: update in place
      for (const modifiedReply of diff.modified) {
        entries = entries.map((e) =>
          e.reply.key === modifiedReply.key ? { ...e, reply: modifiedReply } : e,
        );
      }

      // Apply removed: drop from list
      if (diff.removed.length > 0) {
        const removedSet = new Set(diff.removed);
        entries = entries.filter((e) => !removedSet.has(e.reply.key));
      }

      // Sort to maintain flowTime asc ordering after merge
      entries = [...entries].sort((a, b) => {
        const flowDiff = a.reply.flowTime - b.reply.flowTime;
        if (flowDiff !== 0) return flowDiff;
        const aTime = a.reply.createdAt?.getTime() ?? 0;
        const bTime = b.reply.createdAt?.getTime() ?? 0;
        return aTime - bTime;
      });
    });

    return unsubscribe;
  }
});

// Scroll to first reply at-or-after targetFlowTime, once per mount.
// Runs after tick() so the DOM is settled.
// scrollFired is set synchronously before tick() to short-circuit any concurrent
// effect re-run before the microtask resolves, avoiding a race where two effect
// runs both schedule a tick().then() block before either sets the flag.
$effect(() => {
  if (scrollFired || targetFlowTime == null) return;

  // Read entries to track reactively
  const currentEntries = entries;

  // Guard set synchronously so a concurrent effect re-run exits before scheduling
  // a redundant microtask.
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
