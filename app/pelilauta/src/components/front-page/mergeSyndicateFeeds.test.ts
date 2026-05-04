// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Stream merges feeds and shows the top 5 by recency
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Guaranteed feed substitutes into a stream that excluded it
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Guaranteed feed with zero posts does not force a substitution
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Pool smaller than N renders fewer cards without padding
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §Multiple guaranteed feeds — substituted-in item is not evicted by a subsequent substitution

import { describe, expect, it } from "vitest";
import type { FeedData, RSSItem } from "../../pages/api/rss-feeds.json";
import { mergeSyndicateFeeds } from "./mergeSyndicateFeeds";

function makeItem(source: string, index: number, daysAgo: number): RSSItem {
  const date = new Date(Date.now() - daysAgo * 86400_000);
  return {
    title: `${source.toUpperCase()} Post ${index}`,
    link: `https://example.com/${source}/${index}`,
    pubDate: date.toUTCString(),
    contentSnippet: `Snippet for ${source} post ${index}`,
  };
}

/** Build a FeedData envelope for testing. */
function makeEnvelope(homeUrl: string, guaranteed: boolean, items: RSSItem[]): FeedData[string] {
  return { homeUrl, guaranteed, items };
}

describe("mergeSyndicateFeeds", () => {
  it("Stream merges feeds and shows the top 5 by recency", () => {
    // M1 is most recent (0 days ago), then M2 (2), R1 (3), R2 (4), R3 (5), M3 (6)
    const feedData: FeedData = {
      myrrys: makeEnvelope("https://www.myrrys.com", true, [
        makeItem("myrrys", 1, 0),
        makeItem("myrrys", 2, 2),
        makeItem("myrrys", 3, 6),
      ]),
      roolipelitiedotus: makeEnvelope("https://roolipelitiedotus.fi", false, [
        makeItem("roolipelitiedotus", 1, 3),
        makeItem("roolipelitiedotus", 2, 4),
        makeItem("roolipelitiedotus", 3, 5),
      ]),
    };

    const result = mergeSyndicateFeeds(feedData, 5);

    expect(result).toHaveLength(5);
    // Should be in order: M1 (0d), M2 (2d), R1 (3d), R2 (4d), R3 (5d)
    expect(result[0].source).toBe("myrrys");
    expect(result[0].title).toContain("Post 1");
    expect(result[1].source).toBe("myrrys");
    expect(result[1].title).toContain("Post 2");
    expect(result[2].source).toBe("roolipelitiedotus");
    expect(result[3].source).toBe("roolipelitiedotus");
    expect(result[4].source).toBe("roolipelitiedotus");
    // M3 (index 3, 6 days ago) should be omitted
    const titles = result.map((r) => r.title);
    expect(titles.some((t) => t.includes("MYRRYS Post 3"))).toBe(false);
  });

  it("Guaranteed feed substitutes into a stream that excluded it", () => {
    // myrrys is guaranteed; all natural top-5 are from roolipelitiedotus and extra
    // R1(0d), R2(1d), R3(2d), X1(3d), X2(4d) — myrrys posts are M1(5d), M2(6d), M3(7d)
    const feedData: FeedData = {
      myrrys: makeEnvelope("https://www.myrrys.com", true, [
        makeItem("myrrys", 1, 5),
        makeItem("myrrys", 2, 6),
        makeItem("myrrys", 3, 7),
      ]),
      roolipelitiedotus: makeEnvelope("https://roolipelitiedotus.fi", false, [
        makeItem("roolipelitiedotus", 1, 0),
        makeItem("roolipelitiedotus", 2, 1),
        makeItem("roolipelitiedotus", 3, 2),
      ]),
      extra: makeEnvelope("https://extra.example.com", false, [
        makeItem("extra", 1, 3),
        makeItem("extra", 2, 4),
        makeItem("extra", 3, 8),
      ]),
    };

    const result = mergeSyndicateFeeds(feedData, 5);

    expect(result).toHaveLength(5);
    // Myrrys must be present (guaranteed)
    const myrrysItem = result.find((r) => r.source === "myrrys");
    expect(myrrysItem).toBeDefined();
    // Most recent myrrys post is M1 (5 days ago)
    expect(myrrysItem?.title).toContain("Post 1");

    // The oldest non-guaranteed item that was in the natural top 5 should have been evicted
    // Natural top 5: R1(0), R2(1), R3(2), X1(3), X2(4)
    // Oldest non-guaranteed is X2 (4 days ago) → evicted, replaced by M1
    const sources = result.map((r) => r.source);
    expect(sources).toContain("myrrys");
    // X2 should be evicted
    const x2 = result.find((r) => r.source === "extra" && r.title.includes("Post 2"));
    expect(x2).toBeUndefined();
  });

  it("Guaranteed feed with zero posts does not force a substitution", () => {
    const feedData: FeedData = {
      myrrys: makeEnvelope("https://www.myrrys.com", true, []),
      roolipelitiedotus: makeEnvelope("https://roolipelitiedotus.fi", false, [
        makeItem("roolipelitiedotus", 1, 0),
        makeItem("roolipelitiedotus", 2, 1),
        makeItem("roolipelitiedotus", 3, 2),
      ]),
    };

    const result = mergeSyndicateFeeds(feedData, 5);

    // Only 3 items available from roolipelitiedotus
    expect(result).toHaveLength(3);
    // No myrrys items — no error, no padding
    expect(result.every((r) => r.source === "roolipelitiedotus")).toBe(true);
  });

  it("Pool smaller than N renders fewer cards without padding", () => {
    const feedData: FeedData = {
      myrrys: makeEnvelope("https://www.myrrys.com", true, [
        makeItem("myrrys", 1, 0),
        makeItem("myrrys", 2, 1),
      ]),
      roolipelitiedotus: makeEnvelope("https://roolipelitiedotus.fi", false, [
        makeItem("roolipelitiedotus", 1, 2),
      ]),
    };

    const result = mergeSyndicateFeeds(feedData, 5);

    expect(result).toHaveLength(3);
  });

  it("homeUrl is propagated from the API envelope to each item", () => {
    const feedData: FeedData = {
      myrrys: makeEnvelope("https://www.myrrys.com", true, [makeItem("myrrys", 1, 0)]),
      roolipelitiedotus: makeEnvelope("https://roolipelitiedotus.fi", false, [
        makeItem("roolipelitiedotus", 1, 1),
      ]),
    };

    const result = mergeSyndicateFeeds(feedData, 5);

    const myrrysItem = result.find((r) => r.source === "myrrys");
    expect(myrrysItem?.homeUrl).toBe("https://www.myrrys.com");

    const rpiItem = result.find((r) => r.source === "roolipelitiedotus");
    expect(rpiItem?.homeUrl).toBe("https://roolipelitiedotus.fi");
  });

  it("Ties on pubDate are broken alphabetically by source", () => {
    const sameDate = new Date(2025, 0, 1).toUTCString();
    const feedData: FeedData = {
      myrrys: makeEnvelope("https://www.myrrys.com", true, [
        { title: "M", link: "https://m.com", pubDate: sameDate, contentSnippet: "m" },
      ]),
      roolipelitiedotus: makeEnvelope("https://roolipelitiedotus.fi", false, [
        { title: "R", link: "https://r.com", pubDate: sameDate, contentSnippet: "r" },
      ]),
    };

    const result = mergeSyndicateFeeds(feedData, 5);

    // "myrrys" < "roolipelitiedotus" alphabetically
    expect(result[0].source).toBe("myrrys");
    expect(result[1].source).toBe("roolipelitiedotus");
  });

  it("Multiple guaranteed feeds absent from natural top-N: both substituted in, second does not evict first", () => {
    // feedA (guaranteed) and feedB (guaranteed) both post older than feedC.
    // Natural top 5: C1(0d), C2(1d), C3(2d), C4(3d), C5(4d) — feedA and feedB absent.
    // After feedA substitution: C5 evicted, A1 inserted (substitutedIn).
    // After feedB substitution: C4 is the oldest eligible (C5 is gone; A1 is substitutedIn → immune).
    //   C4 evicted, B1 inserted.
    // Final stream: C1, C2, C3, B1, A1 (after sort by date).
    const feedData: FeedData = {
      feedA: makeEnvelope("https://a.example.com", true, [
        makeItem("feedA", 1, 5),
        makeItem("feedA", 2, 6),
      ]),
      feedB: makeEnvelope("https://b.example.com", true, [
        makeItem("feedB", 1, 7),
        makeItem("feedB", 2, 8),
      ]),
      feedC: makeEnvelope("https://c.example.com", false, [
        makeItem("feedC", 1, 0),
        makeItem("feedC", 2, 1),
        makeItem("feedC", 3, 2),
        makeItem("feedC", 4, 3),
        makeItem("feedC", 5, 4),
      ]),
    };

    const result = mergeSyndicateFeeds(feedData, 5);

    expect(result).toHaveLength(5);

    // Both guaranteed feeds must be present
    const aItem = result.find((r) => r.source === "feedA");
    const bItem = result.find((r) => r.source === "feedB");
    expect(aItem).toBeDefined();
    expect(bItem).toBeDefined();

    // The substituted-in item from feedA (A1) must not have been evicted by feedB's substitution
    expect(aItem?.title).toContain("Post 1");
    expect(bItem?.title).toContain("Post 1");

    // C5 and C4 (the two oldest natural candidates) should have been evicted
    const c4 = result.find((r) => r.source === "feedC" && r.title.includes("Post 4"));
    const c5 = result.find((r) => r.source === "feedC" && r.title.includes("Post 5"));
    expect(c4).toBeUndefined();
    expect(c5).toBeUndefined();
  });
});
