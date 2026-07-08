// Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Date prefers thread.createdAt over flowTime

import { describe, expect, it } from "vitest";
import { getMetadataDate } from "./getMetadataDate";

describe("getMetadataDate", () => {
  it("returns createdAt.getTime() when createdAt is a Date", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Date prefers thread.createdAt over flowTime
    const createdAt = new Date("2025-01-01T00:00:00Z");
    expect(getMetadataDate({ createdAt })).toBe(createdAt.getTime());
  });

  it("returns createdAt ms even when flowTime is much more recent", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Date prefers thread.createdAt over flowTime
    // A thread posted 2025-01-01 that received a reply on 2026-05-30.
    // The date shown must reflect 2025-01-01, not 2026-05-30.
    const createdAt = new Date("2025-01-01T00:00:00Z");
    const flowTime = new Date("2026-05-30T00:00:00Z").getTime(); // recent reply
    expect(getMetadataDate({ createdAt, flowTime })).toBe(createdAt.getTime());
    // Sanity: the two values are meaningfully different
    expect(getMetadataDate({ createdAt, flowTime })).not.toBe(flowTime);
  });

  it("returns 0 when createdAt is undefined (epoch fallback, no crash)", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Date prefers thread.createdAt over flowTime
    expect(getMetadataDate({})).toBe(0);
  });
});
