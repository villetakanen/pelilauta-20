// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §POST /api/threads/{threadKey}/replies requires a bearer token
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Invalid bearer token is rejected
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Frozen accounts are blocked at the write endpoint
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Empty markdownContent is rejected
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Whitespace-only markdownContent is rejected
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Missing thread returns 404
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Successful write returns the parsed Reply
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Client-provided owners and timestamps are ignored

import * as authServer from "@pelilauta/auth/server";
import * as firebaseServer from "@pelilauta/firebase/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeApiContext } from "../../auth/_testContext";
import { POST } from "./replies";

vi.mock("@pelilauta/firebase/server", () => ({
  verifyIdToken: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@pelilauta/auth/server", () => ({
  getAccount: vi.fn(),
}));

// Shared Firestore mock helpers
function makeThreadDocMock(exists: boolean) {
  return {
    exists,
    id: "thread-abc",
    data: () => (exists ? { title: "Test thread" } : undefined),
  };
}

function makeReplyDocMock(id: string) {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    exists: true,
    id,
    data: () => ({
      owners: ["u1"],
      author: "u1",
      threadKey: "abc",
      markdownContent: "Hello world",
      createdAt: now,
      updatedAt: now,
      flowTime: now.getTime(),
      locale: "fi",
      images: [],
    }),
  };
}

function makeDbMock(
  opts: { threadExists?: boolean; writeError?: Error; replyDocId?: string } = {},
) {
  const { threadExists = true, writeError, replyDocId = "auto-id-1" } = opts;

  const addMock = vi.fn();
  const docRefMock = {
    id: replyDocId,
    get: vi.fn().mockResolvedValue(makeReplyDocMock(replyDocId)),
  };

  if (writeError) {
    addMock.mockRejectedValue(writeError);
  } else {
    addMock.mockResolvedValue(docRefMock);
  }

  const threadGetMock = vi.fn().mockResolvedValue(makeThreadDocMock(threadExists));
  const repliesColMock = { add: addMock };
  const threadDocWithColMock = {
    get: threadGetMock,
    collection: vi.fn().mockReturnValue(repliesColMock),
  };

  const db = {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(threadDocWithColMock),
    }),
  };

  return { db, addMock, threadGetMock };
}

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.mocked(authServer.getAccount).mockResolvedValue({ frozen: false });
  vi.mocked(firebaseServer.verifyIdToken).mockResolvedValue({ uid: "u1" } as never);
});

describe("POST /api/threads/[threadKey]/replies", () => {
  // Scenario: POST requires a bearer token
  it("returns 401 when Authorization header is missing", async () => {
    const { ctx } = makeApiContext({ body: { markdownContent: "Hello" } });
    const response = await POST({ ...ctx, params: { threadKey: "abc" } } as never);
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(firebaseServer.verifyIdToken).not.toHaveBeenCalled();
  });

  // Scenario: Invalid bearer token is rejected
  it("returns 401 when verifyIdToken rejects", async () => {
    const { ctx } = makeApiContext({
      headers: { authorization: "Bearer bad-token" },
      body: { markdownContent: "Hello" },
    });
    vi.mocked(firebaseServer.verifyIdToken).mockRejectedValue(new Error("token expired"));

    const response = await POST({ ...ctx, params: { threadKey: "abc" } } as never);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(authServer.getAccount).not.toHaveBeenCalled();
  });

  // Scenario: Frozen accounts are blocked at the write endpoint
  it("returns 403 for frozen accounts", async () => {
    // Verifies: specs/pelilauta/session/frozen.md §Frozen users are blocked by server-side thread-write endpoints
    const { ctx } = makeApiContext({
      headers: { authorization: "Bearer good-token" },
      body: { markdownContent: "Hello" },
    });
    vi.mocked(firebaseServer.verifyIdToken).mockResolvedValue({ uid: "frozen-uid" } as never);
    vi.mocked(authServer.getAccount).mockResolvedValue({ frozen: true });

    const response = await POST({ ...ctx, params: { threadKey: "abc" } } as never);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
    expect(authServer.getAccount).toHaveBeenCalledWith("frozen-uid");
  });

  // Scenario: Empty markdownContent is rejected
  it("returns 400 for empty markdownContent", async () => {
    const { db } = makeDbMock();
    vi.mocked(firebaseServer.getDb).mockReturnValue(db as never);

    const { ctx } = makeApiContext({
      headers: { authorization: "Bearer good-token" },
      body: { markdownContent: "" },
    });

    const response = await POST({ ...ctx, params: { threadKey: "abc" } } as never);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/markdownContent/i);
    expect(db.collection).not.toHaveBeenCalled();
  });

  // Scenario: Whitespace-only markdownContent is rejected
  it("returns 400 for whitespace-only markdownContent", async () => {
    const { db } = makeDbMock();
    vi.mocked(firebaseServer.getDb).mockReturnValue(db as never);

    const { ctx } = makeApiContext({
      headers: { authorization: "Bearer good-token" },
      body: { markdownContent: "   \n  " },
    });

    const response = await POST({ ...ctx, params: { threadKey: "abc" } } as never);

    expect(response.status).toBe(400);
    expect(db.collection).not.toHaveBeenCalled();
  });

  // Scenario: Missing thread returns 404
  it("returns 404 when thread does not exist", async () => {
    const { db, addMock } = makeDbMock({ threadExists: false });
    vi.mocked(firebaseServer.getDb).mockReturnValue(db as never);

    const { ctx } = makeApiContext({
      headers: { authorization: "Bearer good-token" },
      body: { markdownContent: "Hello" },
    });

    const response = await POST({ ...ctx, params: { threadKey: "does-not-exist" } } as never);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Thread not found");
    expect(addMock).not.toHaveBeenCalled();
  });

  // Scenario: Successful write returns the parsed Reply
  it("returns 201 with parsed Reply on success", async () => {
    const { db, addMock } = makeDbMock({ replyDocId: "reply-id-1" });
    vi.mocked(firebaseServer.getDb).mockReturnValue(db as never);

    const { ctx } = makeApiContext({
      headers: { authorization: "Bearer good-token" },
      body: { markdownContent: "Hello world" },
    });

    const response = await POST({ ...ctx, params: { threadKey: "abc" } } as never);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.key).toBe("reply-id-1");
    expect(body.markdownContent).toBe("Hello world");
    expect(body.owners).toEqual(["u1"]);
    expect(body.author).toBe("u1");
    expect(body.threadKey).toBe("abc");
    // flowTime must be a number
    expect(typeof body.flowTime).toBe("number");
    expect(addMock).toHaveBeenCalledOnce();
  });

  // Scenario: Client-provided owners and timestamps are ignored
  it("ignores client-provided owners, author, flowTime, key in the written doc", async () => {
    const { db, addMock } = makeDbMock({ replyDocId: "auto-id-2" });
    vi.mocked(firebaseServer.getDb).mockReturnValue(db as never);

    const { ctx } = makeApiContext({
      headers: { authorization: "Bearer good-token" },
      body: {
        markdownContent: "Hello",
        owners: ["attacker"],
        author: "attacker",
        flowTime: 0,
        key: "forged",
      },
    });

    const response = await POST({ ...ctx, params: { threadKey: "abc" } } as never);

    expect(response.status).toBe(201);
    // Verify what was written to Firestore — the first arg of add()
    const writtenData = addMock.mock.calls[0][0] as Record<string, unknown>;
    expect(writtenData.owners).toEqual(["u1"]);
    expect(writtenData.author).toBe("u1");
    // flowTime should be server-side Date.now(), not 0
    expect(writtenData.flowTime).toBeGreaterThan(0);
    // key is never written (it's the doc ID)
    expect(writtenData.key).toBeUndefined();
  });

  it("returns 400 when images array is non-empty", async () => {
    const { db } = makeDbMock();
    vi.mocked(firebaseServer.getDb).mockReturnValue(db as never);

    const { ctx } = makeApiContext({
      headers: { authorization: "Bearer good-token" },
      body: {
        markdownContent: "Hello",
        images: [{ url: "http://example.com/img.png", alt: "An image" }],
      },
    });

    const response = await POST({ ...ctx, params: { threadKey: "abc" } } as never);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/image/i);
  });
});
