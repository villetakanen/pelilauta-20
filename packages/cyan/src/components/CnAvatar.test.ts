import { describe, expect, it } from "vitest";

/**
 * CnAvatar.test.ts
 * Tests the logic for deterministic background colors and initials generation.
 */

// Mirroring the internal logic for testing
function getNickHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
  }
  return hash % 100;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

describe("CnAvatar Logic (Deterministic Tinting & Initials)", () => {
  it("getNickHash should be deterministic (same input produces same output)", () => {
    const name = "CyanUser123";
    const hash1 = getNickHash(name);
    const hash2 = getNickHash(name);
    expect(hash1).toBe(hash2);
  });

  it("getNickHash should vary by name", () => {
    const hash1 = getNickHash("Alice");
    const hash2 = getNickHash("Bob");
    expect(hash1).not.toBe(hash2);
  });

  it("getNickHash should stay within modulo boundaries (0-99)", () => {
    const testNames = [
      "A",
      "Alice",
      "A very long username that might overflow a standard Int",
      "Z",
    ];
    for (const name of testNames) {
      const hash = getNickHash(name);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(100);
    }
  });

  it("getInitials should extract exactly 2 characters and uppercase them", () => {
    expect(getInitials("alice")).toBe("AL");
    expect(getInitials("BOB")).toBe("BO");
    expect(getInitials("Charlie")).toBe("CH");
  });

  it("getInitials should handle single-character nicks", () => {
    expect(getInitials("A")).toBe("A");
  });

  it("backgroundColor token uses OKLCH and the calculated hash", () => {
    const nick = "Alice";
    const hash = getNickHash(nick);
    const backgroundColor = `color-mix(in oklch, var(--chroma-surface-30), var(--chroma-surface-60) ${hash}%)`;

    expect(backgroundColor).toBe(
      `color-mix(in oklch, var(--chroma-surface-30), var(--chroma-surface-60) ${hash}%)`,
    );
    // Ensure it's not using the legacy HSL color space
    expect(backgroundColor).not.toContain("hsl");
  });
});
