import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ContentEntrySchema } from "../schemas/ContentEntrySchema.js";
import { EntrySchema } from "../schemas/EntrySchema.js";
import { withEntryNormalization } from "./withEntryNormalization.js";

const ts = { seconds: 1_705_320_000, nanoseconds: 0 };

describe("withEntryNormalization", () => {
  it("coerces entry timestamps when no extra normalizer is supplied", () => {
    const Schema = withEntryNormalization(EntrySchema);

    const result = Schema.parse({
      key: "k1",
      createdAt: ts,
      updatedAt: ts,
      flowTime: ts,
    });

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(typeof result.flowTime).toBe("number");
    expect(result.flowTime).toBe(1_705_320_000_000);
  });

  it("runs entry timestamps before subclass normalization", () => {
    const Inner = ContentEntrySchema.extend({
      title: z.string(),
      images: z.array(z.object({ url: z.string(), alt: z.string() })).optional(),
    });

    const seenTimestampType = { value: "" };
    const extra = (raw: unknown) => {
      if (!raw || typeof raw !== "object") return raw;
      const data = { ...(raw as Record<string, unknown>) };
      // Subclass normalization observes the type of createdAt before validation —
      // it should already be a Date because timestamps run first.
      seenTimestampType.value = data.createdAt instanceof Date ? "Date" : typeof data.createdAt;
      if (
        Array.isArray(data.images) &&
        data.images.every((entry): entry is string => typeof entry === "string")
      ) {
        data.images = (data.images as string[]).map((url) => ({ url, alt: `Image [${url}]` }));
      }
      return data;
    };

    const Schema = withEntryNormalization(Inner, extra);

    const result = Schema.parse({
      key: "k1",
      title: "Hello",
      createdAt: ts,
      updatedAt: ts,
      flowTime: ts,
      images: ["https://x/a.png", "https://x/b.png"],
    });

    expect(seenTimestampType.value).toBe("Date");
    expect(result.images).toEqual([
      { url: "https://x/a.png", alt: "Image [https://x/a.png]" },
      { url: "https://x/b.png", alt: "Image [https://x/b.png]" },
    ]);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("propagates Zod parse failures from the inner schema", () => {
    const Inner = ContentEntrySchema.extend({ title: z.string() });
    const Schema = withEntryNormalization(Inner);

    expect(() => Schema.parse({ key: "k1", createdAt: ts })).toThrow();
  });
});
