// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §API route survives a single-feed failure
// Verifies: specs/pelilauta/front-page/syndicate-stream/spec.md §API route is reachable from the front page's deferred render

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock rss-parser before importing the route
vi.mock("rss-parser", () => {
  const Parser = vi.fn();
  Parser.prototype.parseURL = vi.fn();
  return { default: Parser };
});

// Mock logError to assert it was called on failure
vi.mock("@pelilauta/utils/log", () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
}));

// Stub import.meta.env for log helpers
Object.defineProperty(import.meta, "env", {
  value: { PUBLIC_LOG_VERBOSE: "false" },
  configurable: true,
});

import { logError } from "@pelilauta/utils/log";
import Parser from "rss-parser";
import { GET } from "./rss-feeds.json";

const makeRSSItem = (n: number) => ({
  title: `Post ${n}`,
  link: `https://example.com/post-${n}`,
  pubDate: new Date(Date.now() - n * 86400_000).toUTCString(),
  contentSnippet: `Snippet ${n}`,
});

describe("GET /api/rss-feeds.json", () => {
  let parseURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    parseURLMock = Parser.prototype.parseURL as ReturnType<typeof vi.fn>;
    parseURLMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and feeds from both sources on success with new envelope shape", async () => {
    parseURLMock.mockResolvedValue({
      items: [makeRSSItem(1), makeRSSItem(2), makeRSSItem(3)],
    });

    const response = await GET({} as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
    const body = await response.json();

    // New shape: { feedName: { homeUrl, guaranteed, items } }
    expect(body).toHaveProperty("myrrys");
    expect(body).toHaveProperty("roolipelitiedotus");

    // Each feed envelope carries homeUrl and guaranteed from config
    expect(body.myrrys).toHaveProperty("homeUrl", "https://www.myrrys.com");
    expect(body.myrrys).toHaveProperty("guaranteed", true);
    expect(body.myrrys).toHaveProperty("items");
    expect(body.myrrys.items).toHaveLength(3);

    expect(body.roolipelitiedotus).toHaveProperty("homeUrl", "https://roolipelitiedotus.fi");
    expect(body.roolipelitiedotus).toHaveProperty("guaranteed", false);
    expect(body.roolipelitiedotus).toHaveProperty("items");
  });

  it("returns Cache-Control header with s-maxage=600, stale-while-revalidate=86400, stale-if-error=86400", async () => {
    parseURLMock.mockResolvedValue({ items: [] });

    const response = await GET({} as Parameters<typeof GET>[0]);

    const cc = response.headers.get("Cache-Control");
    expect(cc).toContain("s-maxage=600");
    expect(cc).toContain("stale-while-revalidate=86400");
    expect(cc).toContain("stale-if-error=86400");
  });

  it("API route survives a single-feed failure — myrrys times out, roolipelitiedotus returns normally", async () => {
    // parseURL is called once per feed.
    // First call (myrrys) rejects; second call (roolipelitiedotus) resolves.
    parseURLMock.mockRejectedValueOnce(new Error("Connection timeout")).mockResolvedValueOnce({
      items: [makeRSSItem(1), makeRSSItem(2), makeRSSItem(3)],
    });

    const response = await GET({} as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.myrrys.items).toEqual([]);
    expect(body.roolipelitiedotus.items).toHaveLength(3);
    expect(logError).toHaveBeenCalled();
  });

  it("strips items that do not match the RSSItem shape", async () => {
    parseURLMock.mockResolvedValue({
      items: [
        makeRSSItem(1),
        // missing contentSnippet — invalid shape
        {
          title: "Bad item",
          link: "https://example.com",
          pubDate: "Mon, 01 Jan 2024 00:00:00 GMT",
        },
      ],
    });

    const response = await GET({} as Parameters<typeof GET>[0]);
    const body = await response.json();
    // Only the first item passes the validator
    expect(body.myrrys.items).toHaveLength(1);
  });

  it("per-feed metadata propagates from config to API response envelope", async () => {
    parseURLMock.mockResolvedValue({ items: [] });

    const response = await GET({} as Parameters<typeof GET>[0]);
    const body = await response.json();

    // myrrys is configured guaranteed:true in _rss-feeds.config.ts
    expect(body.myrrys.guaranteed).toBe(true);
    expect(body.myrrys.homeUrl).toBe("https://www.myrrys.com");

    // roolipelitiedotus has no guaranteed flag → defaults to false
    expect(body.roolipelitiedotus.guaranteed).toBe(false);
    expect(body.roolipelitiedotus.homeUrl).toBe("https://roolipelitiedotus.fi");
  });
});
