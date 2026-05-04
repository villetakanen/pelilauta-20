import { afterEach, describe, expect, it, vi } from "vitest";
import * as logModule from "../log";
import { netlifyImage } from "./netlifyImage";

const FIREBASE_URL = "https://firebasestorage.googleapis.com/v0/b/example/o/x.webp?alt=media";
const STORAGE_URL = "https://storage.googleapis.com/example-bucket/x.webp";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("netlifyImage", () => {
  it("Production transform: valid Firebase Storage URL produces /.netlify/images? with correct params", () => {
    vi.stubEnv("PROD", true);
    const result = netlifyImage(FIREBASE_URL, {
      width: 800,
      format: "webp",
      quality: 85,
    });
    expect(result).toMatch(/^\/.netlify\/images\?/);
    const params = new URLSearchParams(result.slice("/.netlify/images?".length));
    expect(params.get("url")).toBe(FIREBASE_URL);
    expect(params.get("w")).toBe("800");
    expect(params.get("fm")).toBe("webp");
    expect(params.get("q")).toBe("85");
  });

  it("Development pass-through: returns firebaseUrl unchanged when PROD is false (vitest default)", () => {
    // In vitest, import.meta.env.PROD defaults to false (boolean).
    // vi.stubEnv('PROD', false) is a no-op in vitest (the string 'false' maps to true),
    // so we rely on the vitest default (no stub) for the dev pass-through case.
    vi.unstubAllEnvs();
    const result = netlifyImage(FIREBASE_URL, { width: 800 });
    expect(result).toBe(FIREBASE_URL);
    expect(result).not.toMatch(/^\/.netlify\/images\?/);
  });

  it("Non-Firebase host: logs a warn and returns input verbatim", () => {
    vi.stubEnv("PROD", true);
    const warnSpy = vi.spyOn(logModule, "logWarn");
    const url = "https://example.com/some-image.jpg";
    const result = netlifyImage(url, { width: 800 });
    expect(warnSpy).toHaveBeenCalled();
    expect(result).toBe(url);
    expect(result).not.toMatch(/^\/.netlify\/images\?/);
  });

  it("Substring-spoofed URL is rejected: query-string containing firebase hostname does not pass host gate", () => {
    vi.stubEnv("PROD", true);
    const warnSpy = vi.spyOn(logModule, "logWarn");
    const spoofed = "https://evil-but-cheap.com/large.jpg?ref=firebasestorage.googleapis.com";
    const result = netlifyImage(spoofed, { width: 800 });
    expect(warnSpy).toHaveBeenCalled();
    expect(result).toBe(spoofed);
    expect(result).not.toMatch(/^\/.netlify\/images\?/);
  });

  it("Malformed URL string: logs a warn and returns input verbatim without throwing", () => {
    vi.stubEnv("PROD", true);
    const warnSpy = vi.spyOn(logModule, "logWarn");
    const bad = "not a url";
    const result = netlifyImage(bad, { width: 800 });
    expect(warnSpy).toHaveBeenCalled();
    expect(result).toBe(bad);
    expect(result).not.toMatch(/^\/.netlify\/images\?/);
  });

  it("Sub-pixel width is rounded: 449.7 rounds to 450", () => {
    vi.stubEnv("PROD", true);
    const result = netlifyImage(FIREBASE_URL, { width: 449.7 });
    const params = new URLSearchParams(result.slice("/.netlify/images?".length));
    expect(params.get("w")).toBe("450");
    expect(result).not.toContain("449.7");
  });

  it("Out-of-range quality 0 is omitted: no q= param in result", () => {
    vi.stubEnv("PROD", true);
    const result = netlifyImage(FIREBASE_URL, { quality: 0 });
    const params = new URLSearchParams(result.slice("/.netlify/images?".length));
    expect(params.has("q")).toBe(false);
  });

  it("Out-of-range quality 101 is omitted: no q= param in result", () => {
    vi.stubEnv("PROD", true);
    const result = netlifyImage(FIREBASE_URL, { quality: 101 });
    const params = new URLSearchParams(result.slice("/.netlify/images?".length));
    expect(params.has("q")).toBe(false);
  });

  it("storage.googleapis.com host also passes the Firebase host gate in production", () => {
    vi.stubEnv("PROD", true);
    const result = netlifyImage(STORAGE_URL, { width: 400 });
    expect(result).toMatch(/^\/.netlify/);
  });
});
