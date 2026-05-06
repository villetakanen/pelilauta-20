import { describe, expect, it } from "vitest";
import { normalizeEntryTimestamps } from "./normalizeEntryTimestamps.js";

describe("normalizeEntryTimestamps", () => {
  it("coerces createdAt, updatedAt, and flowTime from Firestore Timestamps", () => {
    const ts = { seconds: 1_705_320_000, nanoseconds: 0 };
    const result = normalizeEntryTimestamps({
      createdAt: ts,
      updatedAt: ts,
      flowTime: ts,
    }) as { createdAt: unknown; updatedAt: unknown; flowTime: unknown };

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(typeof result.flowTime).toBe("number");
    expect(result.flowTime).toBe(1_705_320_000_000);
  });

  it("preserves other fields untouched", () => {
    const result = normalizeEntryTimestamps({
      key: "k1",
      title: "X",
      owners: ["u1"],
      createdAt: 0,
      updatedAt: 0,
      flowTime: 0,
    }) as Record<string, unknown>;

    expect(result.key).toBe("k1");
    expect(result.title).toBe("X");
    expect(result.owners).toEqual(["u1"]);
  });

  it("does not mutate the input object", () => {
    const ts = { seconds: 1_705_320_000, nanoseconds: 0 };
    const input = { createdAt: ts, updatedAt: ts, flowTime: ts };
    normalizeEntryTimestamps(input);

    expect(input.createdAt).toBe(ts);
    expect(input.updatedAt).toBe(ts);
    expect(input.flowTime).toBe(ts);
  });

  it("falls back to epoch Date / 0 for missing fields", () => {
    const result = normalizeEntryTimestamps({}) as {
      createdAt: Date;
      updatedAt: Date;
      flowTime: number;
    };

    expect(result.createdAt.getTime()).toBe(0);
    expect(result.updatedAt.getTime()).toBe(0);
    expect(result.flowTime).toBe(0);
  });

  it.each([null, undefined, "raw", 42, true])("returns %p unchanged", (input) => {
    expect(normalizeEntryTimestamps(input)).toBe(input);
  });
});
