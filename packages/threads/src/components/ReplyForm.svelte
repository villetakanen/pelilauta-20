<script lang="ts">
// ReplyForm — Svelte 5 island for composing and posting thread replies.
//
// Mount conditions: uid != null && sessionState === "active".
// Frozen users see a notice. Anonymous users should never see this component —
// the host renders an <a href="/login?next=..."> CTA instead.
//
// Optimistic append flow:
//   1. User submits → provisional entry (key: "tmp-{uuid}", pending: true) appended via onReplyAppended.
//   2. postReply is called.
//   3. On 201: onReplyAppended called with server reply + _replaceKey=tmpKey.
//   4. On error: onReplyRemoved(tmpKey) called, error shown, draft kept.
//
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Frozen viewers see a notice in place of the form
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Submit appends a provisional entry then reconciles to the server reply
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Submit failure removes the provisional and surfaces the error
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Submit is disabled for empty drafts

import CnChatBar from "@cyan/components/CnChatBar.svelte";
import CnReplyAnchor from "@cyan/components/CnReplyAnchor.svelte";
import {
  profile,
  type SessionProfile,
  type SessionState,
  sessionState,
  uid,
} from "@pelilauta/auth/client";
import { getAuth } from "@pelilauta/firebase/client";
import { onMount } from "svelte";
import { postReply } from "../client/postReply";
import type { Reply } from "../schemas/ReplySchema";
import type { ReplyEntry } from "./types";

interface Props {
  threadKey: string;
  /** Called to append an optimistic provisional or replace it with the server reply. */
  onReplyAppended: (entry: ReplyEntry & { _replaceKey?: string }) => void;
  /** Called to remove a provisional entry on error. */
  onReplyRemoved?: (key: string) => void;
  /** Pre-resolved i18n strings — host resolves these at SSR. Translator
   * functions cannot cross the Astro island boundary; passing strings
   * instead avoids the null-after-hydration trap. */
  placeholderText: string;
  frozenNoticeText: string;
  errorText: string;
}

const {
  threadKey,
  onReplyAppended,
  onReplyRemoved,
  placeholderText,
  frozenNoticeText,
  errorText,
}: Props = $props();

// --- Auth state (mirrors nanostores atoms into local $state) ---
let liveUid = $state<string | null>(null);
let liveSessionState = $state<SessionState>("initial");
let liveProfile = $state<SessionProfile | null>(null);

onMount(() => {
  const unsubUid = uid.subscribe((v) => {
    liveUid = v;
  });
  const unsubSession = sessionState.subscribe((v) => {
    liveSessionState = v;
  });
  const unsubProfile = profile.subscribe((v) => {
    liveProfile = v;
  });
  return () => {
    unsubUid();
    unsubSession();
    unsubProfile();
  };
});

// --- Derived gate ---
const isActive = $derived(liveUid != null && liveSessionState === "active");
const isFrozen = $derived(liveProfile?.frozen === true);

// --- Form state ---
let draft = $state("");
let submitting = $state(false);
let errorMsg = $state<string | null>(null);

const canSubmit = $derived(draft.trim().length > 0 && !submitting);

// --- Submit handler ---
async function handleSubmit(value: string) {
  const content = value.trim();
  if (!content || submitting) return;

  // Close rich composer if open
  submitting = true;
  errorMsg = null;

  const tmpKey = `tmp-${crypto.randomUUID()}`;

  // Build provisional entry
  const now = new Date();
  // liveUid is guaranteed non-null here: handleSubmit only runs when isActive is true,
  // which requires liveUid != null. We fall back to "" as a type-safe sentinel;
  // the server re-derives the author from the verified ID token anyway.
  const safeUid = liveUid ?? "";
  const provisional: Reply = {
    key: tmpKey,
    threadKey,
    owners: [safeUid],
    author: safeUid,
    markdownContent: content,
    createdAt: now,
    updatedAt: now,
    flowTime: Date.now(),
    locale: "fi",
    images: [],
  };

  onReplyAppended({ reply: provisional, bodyHtml: "", profile: null });

  try {
    // Get Firebase ID token — postReply requires it as an explicit param.
    // getAuth() is safe to call CSR-side (this component never mounts on anonymous renders).
    const auth = getAuth();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error("No ID token available — user may not be signed in.");
    }

    const serverReply = await postReply(threadKey, { markdownContent: content }, idToken);

    // Replace provisional with server reply
    onReplyAppended({ reply: serverReply, bodyHtml: "", profile: null, _replaceKey: tmpKey });
    draft = "";
  } catch (_err) {
    // Roll back provisional and surface error
    onReplyRemoved?.(tmpKey);
    errorMsg = errorText;
    // Draft is kept so user doesn't lose their content
  } finally {
    submitting = false;
  }
}

function handleChatBarSend(value: string) {
  void handleSubmit(value);
}
</script>

{#if isActive}
  {#if isFrozen}
    <p class="reply-form__frozen" role="status" aria-live="polite">
      {frozenNoticeText}
    </p>
  {:else}
    <CnReplyAnchor>
      {#snippet overhead()}
        {#if errorMsg}
          <p class="reply-form__error" role="alert" aria-live="polite">{errorMsg}</p>
        {/if}
      {/snippet}
      <CnChatBar
        bind:value={draft}
        placeholder={placeholderText}
        disabled={submitting}
        onsend={handleChatBarSend}
      />
    </CnReplyAnchor>
  {/if}
{/if}
