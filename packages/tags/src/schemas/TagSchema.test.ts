// Tests for TagSchema.
//
// Verifies: specs/pelilauta/tags/spec.md §Parse a tag-index doc through TagSchema

import { describe, expect, it } from "vitest";
import { TagSchema } from "./TagSchema";

describe("TagSchema", () => {
  it("parses a valid tag-index doc with all 6 fields", () => {
    const raw = {
      title: "Adventure log",
      type: "thread",
      key: "abc123",
      tags: ["d%26d", "pathfinder"],
      author: "u-alice",
      flowTime: 1730000000000,
    };

    const result = TagSchema.parse(raw);

    expect(result.title).toBe("Adventure log");
    expect(result.type).toBe("thread");
    expect(result.key).toBe("abc123");
    expect(result.tags).toEqual(["d%26d", "pathfinder"]);
    expect(result.author).toBe("u-alice");
    expect(result.flowTime).toBe(1730000000000);
  });

  it("parses a doc with type='page'", () => {
    const raw = {
      title: "Session notes",
      type: "page",
      key: "site-1/page-2",
      tags: ["pbta"],
      author: "u-bob",
      flowTime: 1730000001000,
    };

    const result = TagSchema.parse(raw);
    expect(result.type).toBe("page");
  });

  it("rejects a doc with an invalid type", () => {
    const raw = {
      title: "Bad doc",
      type: "invalid",
      key: "xyz",
      tags: [],
      author: "u-alice",
      flowTime: 1730000000000,
    };

    expect(() => TagSchema.parse(raw)).toThrow();
  });

  it("rejects a doc with a non-positive flowTime", () => {
    const raw = {
      title: "Bad doc",
      type: "thread",
      key: "xyz",
      tags: [],
      author: "u-alice",
      flowTime: -1,
    };

    expect(() => TagSchema.parse(raw)).toThrow();
  });
});
