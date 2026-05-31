// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §postReply parses the response through ReplySchema
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §postReply rejects non-2xx responses

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postReply } from "./postReply";

const BASE_REPLY = {
  key: "reply-server-id",
  threadKey: "abc",
  owners: ["u1"],
  author: "u1",
  markdownContent: "hi",
  locale: "fi",
  images: [],
  createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
  updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
  flowTime: new Date("2026-01-01T00:00:00Z").getTime(),
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postReply", () => {
  // Scenario: postReply parses the response through ReplySchema
  it("resolves with a Reply where createdAt is a Date instance", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(BASE_REPLY), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await postReply("abc", { markdownContent: "hi" }, "token-123");

    expect(result.key).toBe("reply-server-id");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(typeof result.flowTime).toBe("number");
  });

  it("sends Authorization: Bearer header and Content-Type: application/json", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(BASE_REPLY), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await postReply("abc", { markdownContent: "hi" }, "my-id-token");

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/threads/abc/replies");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer my-id-token");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("only sends markdownContent, images, quoteref in the body (no server-assigned fields)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(BASE_REPLY), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await postReply("abc", { markdownContent: "hi", quoteref: "ref-1" }, "token");

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody.markdownContent).toBe("hi");
    expect(sentBody.quoteref).toBe("ref-1");
    expect(sentBody.owners).toBeUndefined();
    expect(sentBody.author).toBeUndefined();
    expect(sentBody.key).toBeUndefined();
  });

  // Scenario: postReply rejects non-2xx responses
  it("rejects with an Error containing the status and error message for 403", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Forbidden", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    await expect(postReply("abc", { markdownContent: "hi" }, "token")).rejects.toThrow(
      /403.*Forbidden/,
    );
  });

  it("rejects with an Error containing the JSON error field for 400", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "markdownContent is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(postReply("abc", { markdownContent: "" }, "token")).rejects.toThrow(
      /markdownContent is required/,
    );
  });

  it("returns reply with key matching the response body key", async () => {
    const replyJson = { ...BASE_REPLY, key: "unique-key-xyz" };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(replyJson), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await postReply("abc", { markdownContent: "hi" }, "token");
    expect(result.key).toBe("unique-key-xyz");
  });
});
