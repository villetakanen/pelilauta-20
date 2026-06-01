// prepareInitialReplies — SSR data-prep helper for the thread reply list.
//
// Calls getReplies, resolves one profile per reply owner via getProfile
// (parallelised with Promise.all), and pre-renders each reply body with
// markdownToHTML. Returns the initialReplies tuple expected by <ThreadReplies>.
//
// This function is lifted out of the Astro frontmatter so it can be unit-tested
// with mocked collaborators without spinning up the full Astro runtime.
//
// Constraints (ARCHITECTURE.md §SSR Data Flow):
//   - markdownToHTML MUST be called here, not inside any .svelte template.
//   - getProfile MUST be called here, not inside any .svelte component.
//   - Promise.all is used so all profile reads parallelise.
//
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Host page resolves profiles and bodyHtml upstream of ThreadReplies

import type { Profile } from "@pelilauta/profiles/server";
import { getProfile } from "@pelilauta/profiles/server";
import type { Reply } from "@pelilauta/threads/server";
import { getReplies } from "@pelilauta/threads/server";
import { markdownToHTML } from "@pelilauta/utils/markdownToHTML";

export interface InitialReplyEntry {
  reply: Reply;
  bodyHtml: string;
  profile: Profile | null;
}

/**
 * Fetches replies for a thread, resolves author profiles in parallel, and
 * pre-renders each reply body as HTML. Returns an empty array for empty
 * threadKey (getReplies short-circuits; no Firestore read is issued).
 *
 * Errors from getReplies or getProfile propagate to the caller.
 */
export async function prepareInitialReplies(threadKey: string): Promise<InitialReplyEntry[]> {
  const replies = await getReplies(threadKey);
  if (replies.length === 0) return [];

  const profiles = await Promise.all(replies.map((r: Reply) => getProfile(r.owners[0])));

  const entries = await Promise.all(
    replies.map(async (reply: Reply, i: number) => ({
      reply,
      bodyHtml: await markdownToHTML(reply.markdownContent ?? ""),
      profile: profiles[i] ?? null,
    })),
  );

  return entries;
}
