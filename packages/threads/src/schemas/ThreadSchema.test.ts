// Scenarios: "Parse thread from Firestore document" and
// "createThread factory produces a valid blank Thread"
// — specs/pelilauta/threads/spec.md

import { describe, expect, it } from "vitest";
import { createThread, ThreadSchema } from "./ThreadSchema";

describe("ThreadSchema.parse", () => {
  it("converts Firestore Timestamp-shaped dates to Date objects", () => {
    const raw = {
      key: "t1",
      title: "Hello",
      channel: "yleinen",
      owners: ["uid-1"],
      createdAt: { seconds: 1_700_000_000, nanoseconds: 0 },
      updatedAt: { seconds: 1_700_000_500, nanoseconds: 0 },
      flowTime: { seconds: 1_700_000_500, nanoseconds: 0 },
    };
    const thread = ThreadSchema.parse(raw);
    expect(thread.createdAt).toBeInstanceOf(Date);
    expect(thread.createdAt?.getTime()).toBe(1_700_000_000 * 1000);
    expect(thread.updatedAt).toBeInstanceOf(Date);
    // flowTime is stored as epoch ms (number)
    expect(typeof thread.flowTime).toBe("number");
    expect(thread.flowTime).toBe(1_700_000_500_000);
  });

  it("converts a legacy string-url images array to [{url, alt}] objects", () => {
    const raw = {
      title: "x",
      channel: "c",
      owners: ["uid-1"],
      images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    };
    const thread = ThreadSchema.parse(raw);
    expect(thread.images).toEqual([
      { url: "https://example.com/a.jpg", alt: "Image [https://example.com/a.jpg]" },
      { url: "https://example.com/b.jpg", alt: "Image [https://example.com/b.jpg]" },
    ]);
  });

  it("derives author from owners[0] when missing", () => {
    const raw = { title: "x", channel: "c", owners: ["uid-1", "uid-2"] };
    const thread = ThreadSchema.parse(raw);
    expect(thread.author).toBe("uid-1");
  });

  it("forces author to owners[0] even when an explicit author is present (v17 parity)", () => {
    // v17 parseThread: "Forcing the author to be the first owner" — unconditional.
    const raw = { title: "x", channel: "c", owners: ["uid-1"], author: "uid-stale" };
    const thread = ThreadSchema.parse(raw);
    expect(thread.author).toBe("uid-1");
  });

  it("requires owners to be non-empty", () => {
    const raw = { title: "x", channel: "c", owners: [] };
    expect(() => ThreadSchema.parse(raw)).toThrow();
  });

  it("coalesces the legacy `topic` field to `channel`", () => {
    const raw = { title: "x", owners: ["uid-1"], topic: "legacy-channel" };
    const thread = ThreadSchema.parse(raw);
    expect(thread.channel).toBe("legacy-channel");
  });

  it("coalesces missing title/channel to empty string (v17 parity)", () => {
    // v17 parseThread: title = data.title || '', channel = data.channel || data.topic || ''
    const thread = ThreadSchema.parse({ owners: ["uid-1"] });
    expect(thread.title).toBe("");
    expect(thread.channel).toBe("");
  });

  it("coerces missing createdAt/updatedAt to new Date(0) (v17 parity)", () => {
    // v17 parseThread called toDate(data.createdAt) unconditionally;
    // toDate(undefined) returns new Date(0). Consumers may rely on
    // thread.createdAt being a Date, not undefined.
    const thread = ThreadSchema.parse({ title: "x", channel: "c", owners: ["uid-1"] });
    expect(thread.createdAt).toBeInstanceOf(Date);
    expect(thread.createdAt?.getTime()).toBe(0);
    expect(thread.updatedAt).toBeInstanceOf(Date);
    expect(thread.updatedAt?.getTime()).toBe(0);
  });
});

describe("createThread factory", () => {
  it("returns a blank Thread that re-parses cleanly through ThreadSchema", () => {
    const thread = createThread();
    expect(() => ThreadSchema.parse(thread)).not.toThrow();
  });

  it("sets createdAt/updatedAt to the current time (within a small window)", () => {
    const before = Date.now();
    const thread = createThread();
    const after = Date.now();
    expect(thread.createdAt?.getTime()).toBeGreaterThanOrEqual(before);
    expect(thread.createdAt?.getTime()).toBeLessThanOrEqual(after);
  });

  it("uses the '-' sentinel for owners when none supplied", () => {
    const thread = createThread();
    expect(thread.owners).toEqual(["-"]);
    expect(thread.author).toBe("-");
  });

  it("initializes replyCount and lovedCount to 0", () => {
    const thread = createThread();
    expect(thread.replyCount).toBe(0);
    expect(thread.lovedCount).toBe(0);
  });

  it("preserves fields supplied in source over defaults", () => {
    const thread = createThread({ title: "X", channel: "yleinen", owners: ["uid-1"] });
    expect(thread.title).toBe("X");
    expect(thread.channel).toBe("yleinen");
    expect(thread.owners).toEqual(["uid-1"]);
    expect(thread.author).toBe("uid-1");
  });
});
