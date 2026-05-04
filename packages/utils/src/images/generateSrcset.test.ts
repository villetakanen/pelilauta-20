import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSrcset } from "./generateSrcset";

const FIREBASE_URL = "https://firebasestorage.googleapis.com/v0/b/example/o/x.webp?alt=media";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generateSrcset", () => {
  it("N widths produce N comma-separated entries in width-array order", () => {
    vi.stubEnv("PROD", true);
    const widths = [170, 300, 450];
    const result = generateSrcset(FIREBASE_URL, widths, {
      format: "webp",
      quality: 85,
    });
    const entries = result.split(", ");
    expect(entries).toHaveLength(3);
    // Verify order and <url> <width>w shape
    for (let i = 0; i < widths.length; i++) {
      expect(entries[i]).toMatch(new RegExp(`${widths[i]}w$`));
    }
  });

  it('Each entry has the form "<netlifyImage url> <width>w"', () => {
    vi.stubEnv("PROD", true);
    const widths = [400, 800, 1600];
    const result = generateSrcset(FIREBASE_URL, widths, { format: "webp" });
    const entries = result.split(", ");
    for (const entry of entries) {
      // Must end with <digits>w
      expect(entry).toMatch(/\d+w$/);
      // URL part must be a Netlify image URL in production
      const [url] = entry.split(" ");
      expect(url).toMatch(/^\/.netlify\/images\?/);
    }
  });

  it("Default widths [400, 800, 1600] are used when widths is omitted", () => {
    vi.stubEnv("PROD", true);
    const result = generateSrcset(FIREBASE_URL);
    const entries = result.split(", ");
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatch(/400w$/);
    expect(entries[1]).toMatch(/800w$/);
    expect(entries[2]).toMatch(/1600w$/);
  });
});
