import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { EntrySchema, ImageArraySchema } from "./EntrySchema.js";

describe("EntrySchema", () => {
  it("parses a minimal object using defaults", () => {
    const result = EntrySchema.parse({});
    expect(result.key).toBe("");
    expect(result.flowTime).toBe(0);
    expect(result.owners).toEqual([]);
    expect(result.locale).toBe("fi");
    expect(result.createdAt).toBeUndefined();
    expect(result.updatedAt).toBeUndefined();
  });

  it("preserves an explicitly set locale", () => {
    const result = EntrySchema.parse({ locale: "en" });
    expect(result.locale).toBe("en");
  });

  it("accepts non-default locale strings without enumeration", () => {
    // Schema is permissive — UI surfaces constrain the picker, not the schema.
    const result = EntrySchema.parse({ locale: "sv" });
    expect(result.locale).toBe("sv");
  });

  it("parses a full entry", () => {
    const result = EntrySchema.parse({
      key: "abc",
      flowTime: 12345,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-06-01T00:00:00Z",
      owners: ["user1", "user2"],
    });
    expect(result.key).toBe("abc");
    expect(result.flowTime).toBe(12345);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.owners).toEqual(["user1", "user2"]);
  });

  it("coerces a numeric string flowTime", () => {
    const result = EntrySchema.parse({ flowTime: "99" });
    expect(result.flowTime).toBe(99);
  });
});

describe("ImageArraySchema", () => {
  it("defaults to an empty array", () => {
    expect(ImageArraySchema.parse(undefined)).toEqual([]);
  });

  it("parses valid image objects", () => {
    const input = [
      { url: "https://example.com/img.png", alt: "An image" },
      { url: "https://example.com/other.jpg", alt: "" },
    ];
    expect(ImageArraySchema.parse(input)).toEqual(input);
  });

  it("rejects entries missing url or alt", () => {
    expect(() => ImageArraySchema.parse([{ url: "https://x.com/img.png" }])).toThrow(ZodError);
  });
});
