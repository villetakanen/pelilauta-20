// Feed configuration for SyndicateStream.
// Each entry declares the feed name (used as the JSON key and source-attribution label),
// the RSS endpoint URL, the homepage URL (used as the eyebrow link target), the per-feed
// item limit, and an optional guaranteed flag (when true, at least one post from this feed
// MUST appear in the merged top-N stream if the feed returned any posts).
// See specs/pelilauta/front-page/syndicate-stream/spec.md

export type RSSFeedConfig = {
  name: string;
  url: string;
  homeUrl: string;
  limit: number;
  guaranteed?: boolean;
};

export const RSS_FEEDS: RSSFeedConfig[] = [
  {
    name: "myrrys",
    url: "https://www.myrrys.com/blog/rss.xml",
    homeUrl: "https://www.myrrys.com",
    limit: 3,
    guaranteed: true,
  },
  {
    name: "roolipelitiedotus",
    url: "https://roolipelitiedotus.fi/feed/",
    homeUrl: "https://roolipelitiedotus.fi",
    limit: 3,
  },
];
