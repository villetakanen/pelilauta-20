// ThreadReplies component tests
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Anonymous viewer receives the full reply list in SSR
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Authenticated viewer sees new replies appear without reload
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Authenticated viewer sees new replies appear without reload
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §?since={flowTime} scrolls to the first matching reply
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §?since={flowTime} scrolls to the first matching reply
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Anonymous viewer receives the full reply list in SSR
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Own replies render with the reply bubble variant
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Own replies render with the reply bubble variant
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Native #reply-{key} fragment jumps to a reply without JavaScript

import { sessionState as sessionStateAtom, uid as uidAtom } from "@pelilauta/auth/client";
import type { Profile } from "@pelilauta/profiles/server";
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Reply } from "../schemas/ReplySchema";

// Mock subscribeReplies so we control when diffs arrive
const subscribeRepliesMock = vi.fn();
vi.mock("../client/subscribeReplies", () => ({
  subscribeReplies: subscribeRepliesMock,
}));

// Import component AFTER mocks are set up
// (dynamic import used so vi.mock hoisting works)
let ThreadReplies: typeof import("./ThreadReplies.svelte").default;

afterEach(cleanup);

beforeEach(async () => {
  vi.clearAllMocks();
  subscribeRepliesMock.mockReturnValue(() => {});
  // Reset auth atoms to unauthenticated state before each test
  uidAtom.set(null);
  sessionStateAtom.set("initial");
  if (!ThreadReplies) {
    ThreadReplies = (await import("./ThreadReplies.svelte")).default;
  }
});

function makeReply(key: string, overrides: Partial<Reply> = {}): Reply {
  return {
    key,
    threadKey: "t1",
    locale: "fi",
    owners: ["user1"],
    author: "user1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    flowTime: 1000,
    markdownContent: "",
    images: [],
    ...overrides,
  };
}

function makeEntry(key: string, overrides: Partial<Reply> = {}) {
  return {
    reply: makeReply(key, overrides),
    bodyHtml: `<p>body-${key}</p>`,
    profile: null as Profile | null,
  };
}

describe("ThreadReplies", () => {
  // Scenario: ThreadReplies SSR-renders every initialReply with id={reply.key}
  it("renders an article with id for each initialReply", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Anonymous viewer receives the full reply list in SSR
    const entries = [makeEntry("r1"), makeEntry("r2"), makeEntry("r3"), makeEntry("r4")];
    const { container } = render(ThreadReplies, {
      props: {
        threadKey: "t1",
        initialReplies: entries,
      },
    });
    // Each reply renders as <article id={key}> (CnBubble also renders <article class="cn-bubble">
    // so we select by id attribute to count only the reply-level articles)
    const replyArticles = container.querySelectorAll("article[id]");
    expect(replyArticles).toHaveLength(4);
    expect(container.querySelector("article#r1")).not.toBeNull();
    expect(container.querySelector("article#r2")).not.toBeNull();
    expect(container.querySelector("article#r3")).not.toBeNull();
    expect(container.querySelector("article#r4")).not.toBeNull();
  });

  it("renders each article with its bodyHtml", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Anonymous viewer receives the full reply list in SSR
    const entries = [makeEntry("r1"), makeEntry("r2")];
    const { container } = render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: entries },
    });
    expect(container.querySelector("article#r1")?.innerHTML).toContain("body-r1");
    expect(container.querySelector("article#r2")?.innerHTML).toContain("body-r2");
  });

  // Scenario: Native #reply-{key} fragment scrolls without component logic
  // The id={reply.key} assertion above already covers this — id is set on the article element
  // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Native #reply-{key} fragment jumps to a reply without JavaScript

  // Scenario: Anonymous SSR response is uid-independent and listener-free
  it("does NOT call subscribeReplies when uid is null (anonymous)", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Anonymous viewer receives the full reply list in SSR
    uidAtom.set(null);
    sessionStateAtom.set("initial");
    render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: [makeEntry("r1")] },
    });
    expect(subscribeRepliesMock).not.toHaveBeenCalled();
  });

  it("does NOT call subscribeReplies when sessionState is loading (not active)", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Authenticated viewer sees new replies appear without reload
    uidAtom.set("u1");
    sessionStateAtom.set("loading" as Parameters<typeof sessionStateAtom.set>[0]);
    render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: [makeEntry("r1")] },
    });
    expect(subscribeRepliesMock).not.toHaveBeenCalled();
  });

  // Scenario: Authenticated SSR resolves fromUser from currentUid
  it("renders reply with reply bubble class when currentUid matches reply owner", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Own replies render with the reply bubble variant
    const entries = [
      makeEntry("r1", { owners: ["u1"], author: "u1" }),
      makeEntry("r2", { owners: ["u2"], author: "u2" }),
    ];
    const { container } = render(ThreadReplies, {
      props: {
        threadKey: "t1",
        initialReplies: entries,
        currentUid: "u1",
      },
    });
    // r1 authored by u1 should have reply class on bubble
    const r1Bubble = container.querySelector("article#r1 .cn-bubble");
    expect(r1Bubble?.classList.contains("reply")).toBe(true);
    // r2 authored by u2 should NOT have reply class
    const r2Bubble = container.querySelector("article#r2 .cn-bubble");
    expect(r2Bubble?.classList.contains("reply")).toBe(false);
  });

  it("renders all fromUser=false when currentUid is null (anonymous)", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Anonymous viewer receives the full reply list in SSR
    const entries = [makeEntry("r1", { owners: ["u1"] }), makeEntry("r2", { owners: ["u2"] })];
    const { container } = render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: entries, currentUid: null },
    });
    const bubbles = container.querySelectorAll(".cn-bubble");
    for (const bubble of bubbles) {
      expect(bubble.classList.contains("reply")).toBe(false);
    }
  });

  // Scenario: ThreadReplies mounts the realtime listener only when authenticated
  it("calls subscribeReplies when uid is set and sessionState is active", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Authenticated viewer sees new replies appear without reload
    const { flushSync } = await import("svelte");
    uidAtom.set("u1");
    sessionStateAtom.set("active");
    render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: [makeEntry("r1")] },
    });
    flushSync();
    expect(subscribeRepliesMock).toHaveBeenCalledWith("t1", expect.any(Function));
  });

  it("invokes the unsubscribe handle when the component is unmounted", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Authenticated viewer sees new replies appear without reload
    const { flushSync } = await import("svelte");
    const unsubMock = vi.fn();
    subscribeRepliesMock.mockReturnValue(unsubMock);

    uidAtom.set("u1");
    sessionStateAtom.set("active");
    const { unmount } = render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: [makeEntry("r1")] },
    });
    flushSync();
    unmount();
    expect(unsubMock).toHaveBeenCalled();
  });

  // Scenario: ThreadReplies merges a docChanges diff into the rendered list
  it("adds new replies from the diff to the rendered list", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Authenticated viewer sees new replies appear without reload
    const { flushSync } = await import("svelte");
    let capturedCallback: ((diff: unknown) => void) | undefined;
    subscribeRepliesMock.mockImplementation((_key: string, cb: (diff: unknown) => void) => {
      capturedCallback = cb;
      return () => {};
    });

    uidAtom.set("u1");
    sessionStateAtom.set("active");
    const { container } = render(ThreadReplies, {
      props: {
        threadKey: "t1",
        initialReplies: [makeEntry("r1"), makeEntry("r2")],
      },
    });
    flushSync();

    // Fire a diff: add r3
    capturedCallback?.({
      added: [makeReply("r3", { flowTime: 3000 })],
      modified: [],
      removed: [],
    });
    flushSync();

    const articles = container.querySelectorAll("article[id]");
    expect(articles).toHaveLength(3);
    expect(container.querySelector("article#r3")).not.toBeNull();
  });

  it("updates a modified reply in place (by key)", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Authenticated viewer sees new replies appear without reload
    const { flushSync } = await import("svelte");
    let capturedCallback: ((diff: unknown) => void) | undefined;
    subscribeRepliesMock.mockImplementation((_key: string, cb: (diff: unknown) => void) => {
      capturedCallback = cb;
      return () => {};
    });

    uidAtom.set("u1");
    sessionStateAtom.set("active");
    const { container } = render(ThreadReplies, {
      props: {
        threadKey: "t1",
        initialReplies: [makeEntry("r1"), makeEntry("r2")],
      },
    });
    flushSync();

    capturedCallback?.({
      added: [],
      modified: [makeReply("r2", { flowTime: 1000 })],
      removed: [],
    });
    flushSync();

    // Still 2 articles, r2 was updated not duplicated
    const articles = container.querySelectorAll("article[id]");
    expect(articles).toHaveLength(2);
  });

  it("removes replies from the diff", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Authenticated viewer sees new replies appear without reload
    const { flushSync } = await import("svelte");
    let capturedCallback: ((diff: unknown) => void) | undefined;
    subscribeRepliesMock.mockImplementation((_key: string, cb: (diff: unknown) => void) => {
      capturedCallback = cb;
      return () => {};
    });

    uidAtom.set("u1");
    sessionStateAtom.set("active");
    const { container } = render(ThreadReplies, {
      props: {
        threadKey: "t1",
        initialReplies: [makeEntry("r1"), makeEntry("r2")],
      },
    });
    flushSync();

    capturedCallback?.({
      added: [],
      modified: [],
      removed: ["r1"],
    });
    flushSync();

    const articles = container.querySelectorAll("article[id]");
    expect(articles).toHaveLength(1);
    expect(container.querySelector("article#r2")).not.toBeNull();
    expect(container.querySelector("article#r1")).toBeNull();
  });

  // Scenario: ThreadReplies scrolls to the first reply at-or-after targetFlowTime
  it("calls scrollIntoView on the first reply at-or-after targetFlowTime", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §?since={flowTime} scrolls to the first matching reply
    const scrolledTargets: Element[] = [];
    const scrollMock = vi.fn(function (this: Element) {
      scrolledTargets.push(this);
    });
    // jsdom doesn't implement scrollIntoView — mock it
    Element.prototype.scrollIntoView =
      scrollMock as unknown as typeof Element.prototype.scrollIntoView;

    const entries = [
      makeEntry("r1", { flowTime: 100 }),
      makeEntry("r2", { flowTime: 200 }),
      makeEntry("r3", { flowTime: 300 }),
    ];

    const { container } = render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: entries, targetFlowTime: 150 },
    });

    // Wait for tick() inside the $effect
    await new Promise((r) => setTimeout(r, 0));

    // scrollIntoView should have been called exactly once, on r2 (first reply with flowTime >= 150)
    expect(scrollMock).toHaveBeenCalledOnce();
    expect(scrolledTargets[0]).toBe(container.querySelector("article#r2"));
  });

  // Scenario: ThreadReplies does not scroll when no reply matches targetFlowTime
  it("does NOT call scrollIntoView when no reply has flowTime >= targetFlowTime", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §?since={flowTime} scrolls to the first matching reply
    const scrolledTargets: Element[] = [];
    const scrollMock = vi.fn(function (this: Element) {
      scrolledTargets.push(this);
    });
    Element.prototype.scrollIntoView =
      scrollMock as unknown as typeof Element.prototype.scrollIntoView;

    const entries = [
      makeEntry("r1", { flowTime: 100 }),
      makeEntry("r2", { flowTime: 200 }),
      makeEntry("r3", { flowTime: 300 }),
    ];

    render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: entries, targetFlowTime: 9999 },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(scrollMock).not.toHaveBeenCalled();
  });

  // Scenario: ThreadReplies recomputes fromUser when the auth atom resolves
  it("upgrades bubble variant to reply when uid atom resolves after SSR with null", async () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Own replies render with the reply bubble variant
    const { flushSync } = await import("svelte");

    const entries = [makeEntry("r1", { owners: ["u1"] })];
    const { container } = render(ThreadReplies, {
      props: { threadKey: "t1", initialReplies: entries, currentUid: null },
    });

    // Initially no reply class (anonymous)
    expect(container.querySelector(".cn-bubble.reply")).toBeNull();

    // Auth resolves
    uidAtom.set("u1");
    sessionStateAtom.set("active");
    flushSync();

    // Now r1 (authored by u1) should show reply variant
    const bubble = container.querySelector("article#r1 .cn-bubble");
    expect(bubble?.classList.contains("reply")).toBe(true);
  });
});
