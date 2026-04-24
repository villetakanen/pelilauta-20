// Basic legacy-tolerance parity with ThreadSchema — no standalone spec scenario,
// but Stage 2 DoD requires ReplySchema to validate against legacy data unchanged.

import { describe, expect, it } from "vitest";
import { ReplySchema } from "./ReplySchema";

describe("ReplySchema.parse", () => {
  it("parses a typical v17 reply document", () => {
    const raw = {
      key: "r1",
      threadKey: "t1",
      owners: ["uid-1"],
      markdownContent: "body",
      createdAt: { seconds: 1_700_000_000, nanoseconds: 0 },
    };
    const reply = ReplySchema.parse(raw);
    expect(reply.threadKey).toBe("t1");
    expect(reply.createdAt).toBeInstanceOf(Date);
    expect(reply.author).toBe("uid-1");
  });

  it("accepts the v17 lowercase `quoteref` field name", () => {
    const reply = ReplySchema.parse({
      threadKey: "t1",
      owners: ["uid-1"],
      quoteref: "r-quoted",
    });
    expect(reply.quoteref).toBe("r-quoted");
  });

  it("requires threadKey", () => {
    expect(() => ReplySchema.parse({ owners: ["uid-1"] })).toThrow();
  });

  it("requires owners to be non-empty", () => {
    expect(() => ReplySchema.parse({ threadKey: "t1", owners: [] })).toThrow();
  });
});
