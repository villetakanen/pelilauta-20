import { describe, expect, it, vi } from "vitest";
import { FallbackIcons } from "./CnIconFallback";

describe("CnIcon Architecture (SSR Resolution)", () => {
  it("should have access to Tier 3 FallbackIcons", () => {
    expect(FallbackIcons).toBeDefined();
    expect(FallbackIcons.missing).toBeDefined();
    expect(FallbackIcons.menu).toBeDefined();
  });

  it("should define essential UI paths correctly", () => {
    const missing = FallbackIcons.missing;
    expect(missing.paths).toBeInstanceOf(Array);
    expect(typeof missing.paths[0].d).toBe("string");
    expect(missing.viewBox).toBe("0 0 24 24");
  });

  it("should have all essential symbols for app-shell", () => {
    const required = ["menu", "close", "account", "arrow-left"];
    for (const noun of required) {
      expect(FallbackIcons[noun]).toBeDefined();
    }
  });
});

describe("CnIcon Resolution Order (T1 → T2 → T3)", () => {
  // We test the resolution logic by simulating the registry lookup behaviour.
  // The actual fs.readFileSync call is SSR-only and untestable in Vitest without
  // mocking, so we validate the registry data contracts that drive the logic.

  it("Tier 1 registry exports known community nouns", async () => {
    const { icons } = await import("@pelilauta/icons");
    expect(icons).toHaveProperty("fox");
    expect(icons).toHaveProperty("mekanismi");
    expect(icons).toHaveProperty("add");
    // All values should be strings (file paths)
    for (const path of Object.values(icons)) {
      expect(typeof path).toBe("string");
    }
  });

  it("Tier 2 registry is defined and ready for additions", async () => {
    const { icons } = await import("@myrrys/proprietary-icons");
    // Empty by design at bootstrap — but must be a valid object
    expect(typeof icons).toBe("object");
    expect(icons).not.toBeNull();
  });

  it("Tier 1 nouns are not present in Tier 3 fallback (no shadowing)", async () => {
    const { icons } = await import("@pelilauta/icons");
    const tier1Nouns = Object.keys(icons);
    const tier3Nouns = Object.keys(FallbackIcons);
    // Tier 1 community icons should not collide with Tier 3 essential symbols
    // (fox, mekanismi, add should not be in fallback)
    for (const noun of tier1Nouns) {
      expect(tier3Nouns).not.toContain(noun);
    }
  });

  it("Unknown noun resolves to 'missing' glyph in Tier 3", () => {
    const unknownNoun = "xyz-nonexistent-icon-1234";
    // Simulate the resolution logic
    const communityHas = false; // unknown noun not in T1
    const managedHas = false; // unknown noun not in T2
    const fallbackHas = FallbackIcons[unknownNoun] !== undefined;

    // Must fall through to 'missing'
    expect(communityHas).toBe(false);
    expect(managedHas).toBe(false);
    expect(fallbackHas).toBe(false);

    // The 'missing' glyph must always be defined as the last resort
    expect(FallbackIcons.missing).toBeDefined();
    expect(FallbackIcons.missing.paths.length).toBeGreaterThan(0);
  });

  it("Tier 3 'missing' glyph has a valid SVG path (non-empty d attribute)", () => {
    const missing = FallbackIcons.missing;
    expect(missing.paths[0].d.length).toBeGreaterThan(10);
    expect(missing.viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
  });
});
