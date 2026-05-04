// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Stream merges feeds and shows the top 5 by recency
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Guaranteed feed substitutes into a stream that excluded it
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Guaranteed feed with zero posts does not force a substitution
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Pool smaller than N renders fewer cards without padding

import type { FeedData, RSSItem } from "../../pages/api/rss-feeds.json";

export type AnnotatedRSSItem = RSSItem & { source: string; homeUrl: string };

/**
 * Merge algorithm per spec §Architecture → "Merge algorithm":
 * 1. Flatten FeedData into annotated items (source label + homeUrl).
 * 2. Sort by pubDate descending; ties broken alphabetically by source.
 * 3. Take natural top N (N=5) as candidate stream.
 * 4. For each guaranteed feed in config order: if not represented in
 *    candidates and feed has available items outside the candidate set,
 *    evict the chronologically oldest non-guaranteed item (items added
 *    by a prior substitution are not eligible for eviction).
 * 5. Final sort by pubDate descending.
 * 6. If pool < N, return what's there — no padding.
 *
 * feedData is the full API response { [name]: { homeUrl, guaranteed, items } }.
 * The merge reads per-feed metadata directly from feedData — no separate config needed.
 */
export function mergeSyndicateFeeds(feedData: FeedData, n = 5): AnnotatedRSSItem[] {
  // Step 1: Flatten with annotations
  const allItems: AnnotatedRSSItem[] = [];
  for (const [name, envelope] of Object.entries(feedData)) {
    const { homeUrl, items } = envelope;
    for (const item of items) {
      allItems.push({ ...item, source: name, homeUrl });
    }
  }

  // Step 2: Sort by pubDate descending, ties broken alphabetically by source
  const sorted = [...allItems].sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return a.source.localeCompare(b.source);
  });

  // Step 3: Take natural top N as candidate stream
  const candidates = sorted.slice(0, n);

  // Track which items were added via guaranteed-feed substitution
  // (not eligible for eviction by subsequent guaranteed feeds)
  const substitutedIn = new Set<AnnotatedRSSItem>();

  // Step 4: Apply guaranteed-feed substitution — iterate in the order
  // feeds appear in the feedData response (which mirrors config order
  // because the API builds the map by iterating RSS_FEEDS in order).
  for (const [feedName, envelope] of Object.entries(feedData)) {
    if (!envelope.guaranteed) continue;

    const isRepresented = candidates.some((c) => c.source === feedName);
    if (isRepresented) continue;

    // Find available items not already in candidate set
    const candidateSet = new Set(candidates);
    const available = sorted.filter((item) => item.source === feedName && !candidateSet.has(item));
    if (available.length === 0) continue;

    // Most recent available item from this feed
    const toInsert = available[0];

    // Find oldest non-guaranteed, non-substituted-in candidate
    let evictIdx = -1;
    for (let i = candidates.length - 1; i >= 0; i--) {
      const c = candidates[i];
      if (substitutedIn.has(c)) continue;
      if (feedData[c.source]?.guaranteed) continue;
      evictIdx = i;
      break;
    }

    if (evictIdx === -1) continue; // No eligible item to evict

    candidates.splice(evictIdx, 1, toInsert);
    substitutedIn.add(toInsert);
  }

  // Step 5: Final sort by pubDate descending
  candidates.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return a.source.localeCompare(b.source);
  });

  return candidates;
}
