// resolveChannelName — channel display-name resolver for the thread detail page.
//
// Extracted from index.astro frontmatter so this pure function can be unit-tested
// without spinning up the full Astro runtime. Pattern matches prepareInitialReplies.ts.

/**
 * Returns the display name of the channel whose slug matches the thread's
 * `channel` field. Falls back to the raw slug when the channel is not found
 * in the directory.
 */
export function resolveChannelName(
  channelSlug: string,
  channels: Array<{ slug: string; name: string }>,
): string {
  return channels.find((c) => c.slug === channelSlug)?.name ?? channelSlug;
}
