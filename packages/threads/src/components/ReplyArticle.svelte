<script lang="ts">
// ReplyArticle — pure SSR render leaf for a single thread reply.
//
// Composes CnBubble + CnLightbox + ProfileLink + AvatarLink and renders
// pre-rendered bodyHtml via {@html}. No async work, no Firestore reads,
// no markdownToHTML, no getProfile calls.
//
// See specs/pelilauta/threads/detail-page/replies/spec.md
// §ReplyArticle is a pure render
// §Own replies render with the reply bubble variant

import CnBubble from "@cyan/components/CnBubble.svelte";
import CnLightbox from "@cyan/components/CnLightbox.svelte";
import { AvatarLink, ProfileLink } from "@pelilauta/profiles/components";
import type { Profile } from "@pelilauta/profiles/server";
import type { Reply } from "../schemas/ReplySchema";

let {
  reply,
  bodyHtml,
  profile,
  fromUser,
}: {
  reply: Reply;
  bodyHtml: string;
  profile: Profile | null;
  fromUser: boolean;
} = $props();

const lightboxImages = $derived(
  reply.images?.map(({ url, alt }) => ({ src: url, caption: alt })) ?? [],
);
</script>

<article id={reply.key} aria-labelledby="reply-author-{reply.key}">
  <CnBubble reply={fromUser || undefined}>
    <header>
      <AvatarLink {profile} />
      <span id="reply-author-{reply.key}"><ProfileLink {profile} /></span>
    </header>
    {@html bodyHtml}
    {#if lightboxImages.length > 0}
      <CnLightbox images={lightboxImages} />
    {/if}
    <footer>
      <time datetime={reply.createdAt?.toISOString()}>{reply.createdAt?.toLocaleDateString()}</time>
    </footer>
  </CnBubble>
</article>
