// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns true when an entry exists for the canonical or any synonym
// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns false when no matching entry exists
// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries propagates Firestore errors

import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasTaggedEntries } from "./hasTaggedEntries";

// ---------------------------------------------------------------------------
// Mock @pelilauta/firebase/server so tests never touch real Firestore.
// The mock factory returns a getDb function whose return value is a fluent
// Firestore stub: .collection().where().limit().get().
// ---------------------------------------------------------------------------

const mockGet = vi.fn();
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockCollection = vi.fn(() => ({ where: mockWhere }));

vi.mock("@pelilauta/firebase/server", () => ({
  getDb: vi.fn(() => ({ collection: mockCollection })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the mock chain after each test.
  mockLimit.mockReturnValue({ get: mockGet });
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockCollection.mockReturnValue({ where: mockWhere });
});

describe("hasTaggedEntries", () => {
  // -------------------------------------------------------------------------
  // True when snapshot is non-empty
  // -------------------------------------------------------------------------
  describe("returns true when the Firestore snapshot is non-empty", () => {
    it("returns true when the mocked snapshot has at least one doc", async () => {
      // Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns true when an entry exists for the canonical or any synonym
      mockGet.mockResolvedValue({ empty: false });

      const result = await hasTaggedEntries("pathfinder");

      expect(result).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // False when snapshot is empty
  // -------------------------------------------------------------------------
  describe("returns false when the Firestore snapshot is empty", () => {
    it("returns false when the mocked snapshot has no docs", async () => {
      // Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns false when no matching entry exists
      mockGet.mockResolvedValue({ empty: true });

      const result = await hasTaggedEntries("made-up-game-name");

      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // allTags expansion for a known supertag
  // -------------------------------------------------------------------------
  describe("allTags expansion for a known supertag (D&D)", () => {
    it("passes canonical + all synonyms decoded+lowercased to array-contains-any", async () => {
      // Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns true when an entry exists for the canonical or any synonym
      mockGet.mockResolvedValue({ empty: false });

      await hasTaggedEntries("d&d");

      // The .where() call receives the 'array-contains-any' operator and the expanded tag list.
      const whereCall = mockWhere.mock.calls[0] as unknown as [string, string, string[]];
      expect(whereCall[0]).toBe("tags");
      expect(whereCall[1]).toBe("array-contains-any");

      const allTags: string[] = whereCall[2];
      // canonical 'd&d' (decoded form, no further decoding needed)
      expect(allTags).toContain("d&d");
      // synonyms from the registry (decoded + lowercased)
      expect(allTags).toContain("dnd");
      expect(allTags).toContain("deddu");
      expect(allTags).toContain("dungeons & dragons");
      // All entries must be lowercased strings
      for (const tag of allTags) {
        expect(tag).toBe(tag.toLowerCase());
      }
      // D&D has 6 synonyms + 1 canonical = 7 unique entries (no duplicates
      // since 'd&d' is now the canonical and not repeated in the synonyms list).
      expect(allTags).toHaveLength(7);
      // No duplicates after dedup.
      expect(new Set(allTags).size).toBe(allTags.length);
    });
  });

  // -------------------------------------------------------------------------
  // allTags for a plain (unregistered) slug
  // -------------------------------------------------------------------------
  describe("allTags expansion for a plain (unregistered) slug", () => {
    it("passes only the lowercased input when the slug has no registry entry", async () => {
      // Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns false when no matching entry exists
      mockGet.mockResolvedValue({ empty: true });

      await hasTaggedEntries("made-up-game-name");

      const whereCall = mockWhere.mock.calls[0] as unknown as [string, string, string[]];
      const allTags: string[] = whereCall[2];
      // No supertag — only the lowercased input itself.
      expect(allTags).toEqual(["made-up-game-name"]);
    });
  });

  // -------------------------------------------------------------------------
  // Error propagation
  // -------------------------------------------------------------------------
  describe("propagates Firestore errors", () => {
    it("rejects with the same error when .get() rejects", async () => {
      // Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries propagates Firestore errors
      const firestoreError = new Error("Firestore unavailable");
      mockGet.mockRejectedValue(firestoreError);

      await expect(hasTaggedEntries("pathfinder")).rejects.toThrow("Firestore unavailable");
    });
  });

  // -------------------------------------------------------------------------
  // Synonym input resolves to canonical before query
  // -------------------------------------------------------------------------
  describe("synonym input resolves through the canonical before expanding", () => {
    it("calling with a synonym produces the same allTags as calling with canonical", async () => {
      // Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns true when an entry exists for the canonical or any synonym
      mockGet.mockResolvedValue({ empty: true });

      // 'deddu' is a synonym of 'd&d'
      await hasTaggedEntries("deddu");

      const whereCall = mockWhere.mock.calls[0] as unknown as [string, string, string[]];
      const allTags: string[] = whereCall[2];
      // Must still include 'd&d' (decoded canonical) and the full synonym list
      expect(allTags).toContain("d&d");
      expect(allTags).toContain("deddu");
      // Same dedup applies — 7 unique entries after Set collapse.
      expect(allTags).toHaveLength(7);
    });
  });
});
