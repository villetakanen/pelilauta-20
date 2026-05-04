// Verifies: specs/pelilauta/front-page/top-sites-stream/spec.md §Per-card prop computation
// Verifies: specs/pelilauta/front-page/top-sites-stream/spec.md §Renders the most recent 5 non-hidden sites as cards
// Verifies: specs/pelilauta/front-page/top-sites-stream/spec.md §Empty site list renders without error

import type { TFn } from "@pelilauta/i18n";
import type { Site } from "@pelilauta/sites/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildTopSiteCards } from "./buildTopSiteCards";

function makeSite(over: Partial<Site> = {}): Site {
  return {
    key: "test-site",
    locale: "fi",
    name: "Test Site",
    system: "homebrew",
    description: undefined,
    hidden: false,
    license: "0",
    sortOrder: "name",
    customPageKeys: false,
    usePlainTextURLs: false,
    useSidebar: true,
    owners: ["u1"],
    players: [],
    flowTime: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  };
}

// fakeT returns the key unchanged when no translation exists (mirrors real t() miss behavior).
const fakeT: TFn = (key: string) => key;

function makeTWithSystem(system: string, label: string): TFn {
  return (key: string) => {
    if (key === `sites:site.systems.${system}`) return label;
    return key;
  };
}

const DEFAULT_LOCALE = "en";
const FIREBASE_URL = "https://firebasestorage.googleapis.com/v0/b/example/o/poster.webp?alt=media";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildTopSiteCards", () => {
  // --- Empty list ---
  it("returns an empty array when sites is empty", () => {
    expect(buildTopSiteCards([], DEFAULT_LOCALE, fakeT)).toEqual([]);
  });

  // --- Cardinality and order ---
  it("emits one card per site (5 in → 5 out)", () => {
    const sites = Array.from({ length: 5 }, (_, i) => makeSite({ key: `s${i}` }));
    expect(buildTopSiteCards(sites, DEFAULT_LOCALE, fakeT)).toHaveLength(5);
  });

  it("preserves caller-controlled order across the mapping", () => {
    const sites = [
      makeSite({ key: "a", flowTime: 3 }),
      makeSite({ key: "b", flowTime: 2 }),
      makeSite({ key: "c", flowTime: 1 }),
    ];
    const cards = buildTopSiteCards(sites, DEFAULT_LOCALE, fakeT);
    expect(cards.map((c) => c.key)).toEqual(["a", "b", "c"]);
  });

  // --- Threaded fields pass-through ---
  it("threads name, key, description, owners, players through unchanged", () => {
    const site = makeSite({
      key: "my-site",
      name: "My Site",
      description: "A campaign wiki.",
      owners: ["u1", "u2"],
      players: ["u3"],
    });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.key).toBe("my-site");
    expect(card.name).toBe("My Site");
    expect(card.description).toBe("A campaign wiki.");
    expect(card.owners).toEqual(["u1", "u2"]);
    expect(card.players).toEqual(["u3"]);
  });

  it("defaults players to empty array when site.players is undefined", () => {
    const site = makeSite({ players: undefined });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.players).toEqual([]);
  });

  // --- systemNoun boundary ---
  it("systemNoun is a non-empty string derived from systemToNoun(site.system)", () => {
    const site = makeSite({ system: "dnd5e" });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(typeof card.systemNoun).toBe("string");
    expect(card.systemNoun.length).toBeGreaterThan(0);
  });

  it("systemNoun is not the raw system slug (it is a cyan icon noun)", () => {
    const site = makeSite({ system: "dnd5e" });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.systemNoun).not.toBe("dnd5e");
  });

  it("systemNoun falls back to 'homebrew' for unknown systems", () => {
    const site = makeSite({ system: "unknown-rpg-xyz" });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.systemNoun).toBe("homebrew");
  });

  // --- systemLabel: raw-slug fallback when i18n key is missing ---
  it("systemLabel is the raw system slug when t() returns the key (missing translation)", () => {
    // fakeT returns the key unchanged → treated as missing → falls back to raw slug.
    const site = makeSite({ system: "dnd5e" });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.systemLabel).toBe("dnd5e");
  });

  it("systemLabel is the localized string when the i18n key resolves to a translation", () => {
    const t = makeTWithSystem("dnd5e", "Dungeons & Dragons 5e");
    const site = makeSite({ system: "dnd5e" });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, t);
    expect(card.systemLabel).toBe("Dungeons & Dragons 5e");
  });

  it("systemLabel falls back to raw slug for homebrew (no i18n entry at MVP)", () => {
    const site = makeSite({ system: "homebrew" });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.systemLabel).toBe("homebrew");
  });

  // --- systemHref ---
  it("systemHref is /tags/ followed by the system slug", () => {
    const site = makeSite({ system: "dnd5e" });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.systemHref).toBe("/tags/dnd5e");
  });

  // --- Cover image: no posterURL ---
  it("coverUrl, coverSrcset, coverSizes are all undefined when posterURL is absent", () => {
    const site = makeSite({ posterURL: undefined });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.coverUrl).toBeUndefined();
    expect(card.coverSrcset).toBeUndefined();
    expect(card.coverSizes).toBeUndefined();
  });

  // --- Cover image: dev environment (default in vitest — PROD is false) ---
  it("in dev (PROD=false): coverUrl is the raw posterURL, coverSrcset and coverSizes are undefined", () => {
    vi.unstubAllEnvs(); // ensure PROD=false (vitest default)
    const site = makeSite({ posterURL: FIREBASE_URL });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    // netlifyImage passes through in dev, so the raw URL is used
    expect(card.coverUrl).toBe(FIREBASE_URL);
    expect(card.coverSrcset).toBeUndefined();
    expect(card.coverSizes).toBeUndefined();
  });

  // --- Cover image: prod environment ---
  it("in prod (PROD=true): coverUrl is a Netlify CDN URL", () => {
    vi.stubEnv("PROD", true);
    const site = makeSite({ posterURL: FIREBASE_URL });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.coverUrl).toMatch(/^\/.netlify\/images\?/);
  });

  it("in prod (PROD=true): coverSrcset is a non-empty srcset string", () => {
    vi.stubEnv("PROD", true);
    const site = makeSite({ posterURL: FIREBASE_URL });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(typeof card.coverSrcset).toBe("string");
    expect(card.coverSrcset).not.toBe("");
  });

  it("in prod (PROD=true): coverSizes is the v18 carry-forward sizes hint", () => {
    vi.stubEnv("PROD", true);
    const site = makeSite({ posterURL: FIREBASE_URL });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(card.coverSizes).toBe("(max-width: 768px) 100vw, 450px");
  });

  // --- dateLabel boundary ---
  it("emits a non-empty dateLabel string for each card", () => {
    const site = makeSite({ flowTime: Date.now() - 1000 });
    const [card] = buildTopSiteCards([site], DEFAULT_LOCALE, fakeT);
    expect(typeof card.dateLabel).toBe("string");
    expect(card.dateLabel.length).toBeGreaterThan(0);
  });

  it("dateLabel is ISO YYYY-MM-DD for a flowTime older than 7 days", () => {
    const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const site = makeSite({ flowTime: oldTime });
    const [card] = buildTopSiteCards([site], "en", fakeT);
    expect(card.dateLabel).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("dateLabel is a relative string (not ISO) for a flowTime within the last 7 days", () => {
    const recentTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
    const site = makeSite({ flowTime: recentTime });
    const [card] = buildTopSiteCards([site], "en", fakeT);
    expect(card.dateLabel).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(card.dateLabel.length).toBeGreaterThan(0);
  });

  it("dateLabel passes locale to the dateLabel util (fi vs en produce different strings)", () => {
    const recentTime = Date.now() - 2 * 60 * 60 * 1000;
    const site = makeSite({ flowTime: recentTime });
    const cardEn = buildTopSiteCards([site], "en", fakeT)[0];
    const cardFi = buildTopSiteCards([site], "fi", fakeT)[0];
    expect(typeof cardEn.dateLabel).toBe("string");
    expect(typeof cardFi.dateLabel).toBe("string");
    // Finnish and English relative time strings differ.
    expect(cardEn.dateLabel).not.toBe(cardFi.dateLabel);
  });
});
