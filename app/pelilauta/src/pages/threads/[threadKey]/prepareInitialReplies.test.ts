// Verifies: specs/pelilauta/threads/replies/spec.md §Host page resolves profiles and bodyHtml upstream of ThreadReplies

import type { Profile } from "@pelilauta/profiles/server";
import type { Reply } from "@pelilauta/threads/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareInitialReplies } from "./prepareInitialReplies";

vi.mock("@pelilauta/threads/server", () => ({
  getReplies: vi.fn(),
}));
vi.mock("@pelilauta/profiles/server", () => ({
  getProfile: vi.fn(),
}));
vi.mock("@pelilauta/utils/markdownToHTML", () => ({
  markdownToHTML: vi.fn(),
}));

import { getProfile } from "@pelilauta/profiles/server";
import { getReplies } from "@pelilauta/threads/server";
import { markdownToHTML } from "@pelilauta/utils/markdownToHTML";

function makeReply(over: Partial<Reply> = {}): Reply {
  return {
    key: "r1",
    threadKey: "t1",
    owners: ["u1"],
    author: "u1",
    flowTime: 1000,
    createdAt: new Date(1000),
    updatedAt: new Date(1000),
    markdownContent: "hello",
    ...over,
  } as Reply;
}

const profileU1: Profile = { key: "u1", nick: "Alice", username: "alice" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("prepareInitialReplies", () => {
  it("returns an empty array when getReplies returns []", async () => {
    vi.mocked(getReplies).mockResolvedValue([]);

    const result = await prepareInitialReplies("t1");

    expect(result).toEqual([]);
    expect(getProfile).not.toHaveBeenCalled();
    expect(markdownToHTML).not.toHaveBeenCalled();
  });

  it("calls getReplies once with the threadKey", async () => {
    vi.mocked(getReplies).mockResolvedValue([]);

    await prepareInitialReplies("abc");

    expect(getReplies).toHaveBeenCalledWith("abc");
    expect(getReplies).toHaveBeenCalledTimes(1);
  });

  it("resolves profiles via Promise.all(replies.map(r => getProfile(r.owners[0])))", async () => {
    const replies = [
      makeReply({ key: "r1", owners: ["u1"] }),
      makeReply({ key: "r2", owners: ["u2"] }),
    ];
    vi.mocked(getReplies).mockResolvedValue(replies);
    vi.mocked(getProfile).mockImplementation(async (uid: string) =>
      uid === "u1" ? profileU1 : null,
    );
    vi.mocked(markdownToHTML).mockResolvedValue("<p>hello</p>");

    const result = await prepareInitialReplies("t1");

    expect(getProfile).toHaveBeenCalledWith("u1");
    expect(getProfile).toHaveBeenCalledWith("u2");
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(result[0].profile).toBe(profileU1);
    expect(result[1].profile).toBeNull();
  });

  it("calls markdownToHTML per reply using reply.markdownContent", async () => {
    const replies = [
      makeReply({ key: "r1", markdownContent: "# H1" }),
      makeReply({ key: "r2", markdownContent: "body" }),
    ];
    vi.mocked(getReplies).mockResolvedValue(replies);
    vi.mocked(getProfile).mockResolvedValue(null);
    vi.mocked(markdownToHTML).mockImplementation(
      async (md: string) => `<rendered>${md}</rendered>`,
    );

    const result = await prepareInitialReplies("t1");

    expect(markdownToHTML).toHaveBeenCalledWith("# H1");
    expect(markdownToHTML).toHaveBeenCalledWith("body");
    expect(markdownToHTML).toHaveBeenCalledTimes(2);
    expect(result[0].bodyHtml).toBe("<rendered># H1</rendered>");
    expect(result[1].bodyHtml).toBe("<rendered>body</rendered>");
  });

  it("returns the correct { reply, bodyHtml, profile } tuple shape for each reply", async () => {
    const reply = makeReply({ key: "r1", owners: ["u1"], markdownContent: "hello" });
    vi.mocked(getReplies).mockResolvedValue([reply]);
    vi.mocked(getProfile).mockResolvedValue(profileU1);
    vi.mocked(markdownToHTML).mockResolvedValue("<p>hello</p>");

    const result = await prepareInitialReplies("t1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      reply,
      bodyHtml: "<p>hello</p>",
      profile: profileU1,
    });
  });

  it("uses empty string fallback when markdownContent is undefined", async () => {
    const reply = makeReply({ key: "r1", markdownContent: undefined });
    vi.mocked(getReplies).mockResolvedValue([reply]);
    vi.mocked(getProfile).mockResolvedValue(null);
    vi.mocked(markdownToHTML).mockResolvedValue("");

    await prepareInitialReplies("t1");

    expect(markdownToHTML).toHaveBeenCalledWith("");
  });
});
