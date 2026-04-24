import { describe, expect, it } from "vitest";
import { ContentEntrySchema } from "./ContentEntrySchema.js";

describe("ContentEntrySchema", () => {
  it("parses a minimal object using defaults", () => {
    const result = ContentEntrySchema.parse({});
    expect(result.key).toBe("");
    expect(result.flowTime).toBe(0);
    expect(result.owners).toEqual([]);
    expect(result.public).toBeUndefined();
    expect(result.sticky).toBeUndefined();
    expect(result.tags).toBeUndefined();
    expect(result.markdownContent).toBeUndefined();
    expect(result.author).toBeUndefined();
  });

  it("parses a full content entry", () => {
    const result = ContentEntrySchema.parse({
      key: "post-1",
      flowTime: 999,
      owners: ["admin"],
      public: true,
      sticky: false,
      tags: ["rpg", "news"],
      markdownContent: "# Hello",
      author: "user42",
    });
    expect(result.key).toBe("post-1");
    expect(result.public).toBe(true);
    expect(result.sticky).toBe(false);
    expect(result.tags).toEqual(["rpg", "news"]);
    expect(result.markdownContent).toBe("# Hello");
    expect(result.author).toBe("user42");
  });

  it("inherits EntrySchema fields", () => {
    const result = ContentEntrySchema.parse({
      key: "inherited",
      createdAt: "2024-01-01T00:00:00Z",
    });
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});
