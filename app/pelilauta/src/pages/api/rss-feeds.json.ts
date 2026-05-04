// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §API route is reachable from the front page's deferred render
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §API route survives a single-feed failure

import { logDebug, logError } from "@pelilauta/utils/log";
import type { APIRoute } from "astro";
import Parser from "rss-parser";
import { RSS_FEEDS } from "../../_rss-feeds.config";

const TIMEOUT_MS = 3000;

export type RSSItem = {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
};

/**
 * Per-feed envelope in the API response.
 * The widget reads homeUrl and guaranteed from here so it does not need
 * to import the feed config — the API is the single boundary.
 */
export type FeedEnvelope = {
  homeUrl: string;
  guaranteed: boolean;
  items: RSSItem[];
};

/**
 * Full API response shape: { [feedName]: FeedEnvelope }
 */
export type FeedData = Record<string, FeedEnvelope>;

async function fetchRSSWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Parser.Output<unknown> | null> {
  try {
    const parser = new Parser({ timeout: timeoutMs });

    const fetchPromise = parser.parseURL(url);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
    );

    const feed = await Promise.race([fetchPromise, timeoutPromise]);
    return feed;
  } catch (error) {
    logError("fetchRSSWithTimeout", "RSS fetch failed", { url, error });
    return null;
  }
}

function isValidRSSItem(item: unknown): item is RSSItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "title" in item &&
    typeof (item as Record<string, unknown>).title === "string" &&
    "link" in item &&
    typeof (item as Record<string, unknown>).link === "string" &&
    "pubDate" in item &&
    typeof (item as Record<string, unknown>).pubDate === "string" &&
    "contentSnippet" in item &&
    typeof (item as Record<string, unknown>).contentSnippet === "string"
  );
}

export const GET: APIRoute = async () => {
  logDebug("api/rss-feeds", "Fetching RSS feeds");

  const feedPromises = RSS_FEEDS.map(async ({ name, url, limit, homeUrl, guaranteed }) => {
    const feed = await fetchRSSWithTimeout(url, TIMEOUT_MS);

    if (!feed) {
      return { name, homeUrl, guaranteed: guaranteed ?? false, posts: [] as RSSItem[] };
    }

    const posts = feed.items
      .filter(isValidRSSItem)
      .slice(0, limit)
      .map((item) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: item.contentSnippet,
      }));

    return { name, homeUrl, guaranteed: guaranteed ?? false, posts };
  });

  const results = await Promise.all(feedPromises);

  const feedData = results.reduce((acc, { name, homeUrl, guaranteed, posts }) => {
    acc[name] = { homeUrl, guaranteed, items: posts };
    return acc;
  }, {} as FeedData);

  return new Response(JSON.stringify(feedData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=600, stale-while-revalidate=86400, stale-if-error=86400",
    },
  });
};
