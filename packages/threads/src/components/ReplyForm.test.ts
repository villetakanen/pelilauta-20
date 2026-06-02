// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Frozen viewers see a notice in place of the form
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Submit appends a provisional entry then reconciles to the server reply
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Submit failure removes the provisional and surfaces the error
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Submit is disabled for empty drafts

import {
  profile as profileAtom,
  sessionState as sessionStateAtom,
  uid as uidAtom,
} from "@pelilauta/auth/client";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetForTests, getStore } from "../client/replyEntriesStore";

// Mock Firebase client (getAuth)
vi.mock("@pelilauta/firebase/client", () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("mock-id-token"),
    },
  })),
}));

const postReplyMock = vi.fn();
vi.mock("../client/postReply", () => ({
  postReply: postReplyMock,
}));

vi.mock("@cyan/components/CnChatBar.svelte", async () => {
  const { default: MockChatBar } = await import("./__mocks__/MockChatBar.svelte");
  return { default: MockChatBar };
});

vi.mock("@cyan/components/CnReplyAnchor.svelte", async () => {
  const { default: MockAnchor } = await import("./__mocks__/MockReplyAnchor.svelte");
  return { default: MockAnchor };
});

let ReplyForm: typeof import("./ReplyForm.svelte").default;

const baseProps = {
  threadKey: "t1",
  initialReplies: [],
  placeholderText: "Write a reply…",
  frozenNoticeText: "Account frozen.",
  errorText: "Send failed.",
};

afterEach(cleanup);

beforeEach(async () => {
  vi.clearAllMocks();
  __resetForTests();
  uidAtom.set(null);
  sessionStateAtom.set("initial");
  profileAtom.set(null);
  if (!ReplyForm) {
    ReplyForm = (await import("./ReplyForm.svelte")).default;
  }
});

function makeServerReply(key = "server-id") {
  return {
    key,
    threadKey: "t1",
    owners: ["u1"],
    author: "u1",
    markdownContent: "Hello world",
    locale: "fi" as const,
    images: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    flowTime: new Date("2026-01-01T00:00:00Z").getTime(),
  };
}

async function setActiveSesssion(frozen?: boolean) {
  const { flushSync } = await import("svelte");
  uidAtom.set("u1");
  sessionStateAtom.set("active");
  profileAtom.set({ nick: "Alice", ...(frozen !== undefined ? { frozen } : {}) });
  flushSync();
}

describe("ReplyForm", () => {
  // Scenario: Frozen viewers see a notice in place of the form
  it("renders frozen notice and no chat bar when profile.frozen is true", async () => {
    await setActiveSesssion(true);

    const { container } = render(ReplyForm, { props: baseProps });
    const { flushSync } = await import("svelte");
    flushSync();

    expect(container.querySelector(".reply-form__frozen")).not.toBeNull();
    expect(container.querySelector("[data-testid='cn-chat-bar']")).toBeNull();
  });

  it("renders nothing when uid is null (anonymous gate)", async () => {
    uidAtom.set(null);
    sessionStateAtom.set("initial");
    const { flushSync } = await import("svelte");

    const { container } = render(ReplyForm, { props: baseProps });
    flushSync();

    expect(container.querySelector(".reply-form__frozen")).toBeNull();
    expect(container.querySelector("[data-testid='cn-chat-bar']")).toBeNull();
  });

  it("renders the chat bar when authenticated and not frozen", async () => {
    await setActiveSesssion(false);

    const { container } = render(ReplyForm, { props: baseProps });
    const { flushSync } = await import("svelte");
    flushSync();

    expect(container.querySelector("[data-testid='cn-chat-bar']")).not.toBeNull();
  });

  // Scenario: Submit appends a provisional entry then reconciles to the server reply
  it("writes a provisional entry then replaces it with the server reply on success", async () => {
    await setActiveSesssion(false);

    const serverReply = makeServerReply("server-id-1");
    postReplyMock.mockResolvedValueOnce(serverReply);

    render(ReplyForm, { props: baseProps });
    const { flushSync } = await import("svelte");
    flushSync();

    const input = screen.getByTestId("mock-chat-input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Hello world" } });
    await fireEvent.click(screen.getByTestId("mock-send-btn"));

    await waitFor(() => {
      const entries = getStore("t1").get();
      expect(entries).toHaveLength(1);
      expect(entries[0].reply.key).toBe("server-id-1");
    });

    expect(input.value).toBe("");
    expect((screen.getByTestId("mock-send-btn") as HTMLButtonElement).disabled).toBe(false);
  });

  // Scenario: Submit failure removes the provisional and surfaces the error
  it("removes the provisional and shows error on failure", async () => {
    await setActiveSesssion(false);

    postReplyMock.mockRejectedValueOnce(new Error("403: Forbidden"));

    const { container } = render(ReplyForm, { props: baseProps });
    const { flushSync } = await import("svelte");
    flushSync();

    const input = screen.getByTestId("mock-chat-input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Hello" } });
    await fireEvent.click(screen.getByTestId("mock-send-btn"));

    await waitFor(() => {
      expect(container.querySelector(".reply-form__error")).not.toBeNull();
    });

    expect(getStore("t1").get()).toHaveLength(0);
    expect(input.value).toBe("Hello");
  });

  // Scenario: Submit is disabled for empty drafts
  it("does not call postReply for empty draft", async () => {
    await setActiveSesssion(false);
    render(ReplyForm, { props: baseProps });
    const { flushSync } = await import("svelte");
    flushSync();

    await fireEvent.click(screen.getByTestId("mock-send-btn"));

    expect(postReplyMock).not.toHaveBeenCalled();
    expect(getStore("t1").get()).toHaveLength(0);
  });

  it("does not call postReply for whitespace-only draft", async () => {
    await setActiveSesssion(false);
    render(ReplyForm, { props: baseProps });
    const { flushSync } = await import("svelte");
    flushSync();

    const input = screen.getByTestId("mock-chat-input");
    await fireEvent.input(input, { target: { value: "   " } });
    await fireEvent.click(screen.getByTestId("mock-send-btn"));

    expect(postReplyMock).not.toHaveBeenCalled();
    expect(getStore("t1").get()).toHaveLength(0);
  });
});
