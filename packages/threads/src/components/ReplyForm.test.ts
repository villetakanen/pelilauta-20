// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Frozen viewers see a notice in place of the form
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Submit appends a provisional entry then reconciles to the server reply
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Submit failure removes the provisional and surfaces the error
// Verifies: specs/pelilauta/threads/replies/authoring/spec.md §Submit is disabled for empty drafts

import {
  profile as profileAtom,
  sessionState as sessionStateAtom,
  uid as uidAtom,
} from "@pelilauta/auth/client";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Firebase client (getAuth)
vi.mock("@pelilauta/firebase/client", () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("mock-id-token"),
    },
  })),
}));

// Mock postReply
const postReplyMock = vi.fn();
vi.mock("../client/postReply", () => ({
  postReply: postReplyMock,
}));

// Mock DS components — they render correctly but we don't need full DS in unit tests
vi.mock("@cyan/components/CnChatBar.svelte", async () => {
  const { default: MockChatBar } = await import("./__mocks__/MockChatBar.svelte");
  return { default: MockChatBar };
});

vi.mock("@cyan/components/CnReplyAnchor.svelte", async () => {
  const { default: MockAnchor } = await import("./__mocks__/MockReplyAnchor.svelte");
  return { default: MockAnchor };
});

let ReplyForm: typeof import("./ReplyForm.svelte").default;

afterEach(cleanup);

beforeEach(async () => {
  vi.clearAllMocks();
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

    const { container } = render(ReplyForm, {
      props: {
        threadKey: "t1",
        placeholderText: "Write a reply…",
        frozenNoticeText: "Account frozen.",
        errorText: "Send failed.",
        onReplyAppended: vi.fn(),
      },
    });
    const { flushSync } = await import("svelte");
    flushSync();

    // Should show frozen notice
    const notice = container.querySelector(".reply-form__frozen");
    expect(notice).not.toBeNull();

    // No chat bar (mock) rendered
    expect(container.querySelector("[data-testid='cn-chat-bar']")).toBeNull();
  });

  it("renders nothing when uid is null (anonymous gate)", async () => {
    uidAtom.set(null);
    sessionStateAtom.set("initial");
    const { flushSync } = await import("svelte");

    const { container } = render(ReplyForm, {
      props: {
        threadKey: "t1",
        placeholderText: "Write a reply…",
        frozenNoticeText: "Account frozen.",
        errorText: "Send failed.",
        onReplyAppended: vi.fn(),
      },
    });
    flushSync();

    expect(container.querySelector(".reply-form__frozen")).toBeNull();
    expect(container.querySelector("[data-testid='cn-chat-bar']")).toBeNull();
  });

  it("renders the chat bar when authenticated and not frozen", async () => {
    await setActiveSesssion(false);

    const { container } = render(ReplyForm, {
      props: {
        threadKey: "t1",
        placeholderText: "Write a reply…",
        frozenNoticeText: "Account frozen.",
        errorText: "Send failed.",
        onReplyAppended: vi.fn(),
      },
    });
    const { flushSync } = await import("svelte");
    flushSync();

    expect(container.querySelector("[data-testid='cn-chat-bar']")).not.toBeNull();
  });

  // Scenario: Submit appends a provisional entry then reconciles to the server reply
  it("calls onReplyAppended with provisional then server reply on success", async () => {
    await setActiveSesssion(false);

    const serverReply = makeServerReply("server-id-1");
    postReplyMock.mockResolvedValueOnce(serverReply);

    const onReplyAppended = vi.fn();
    render(ReplyForm, {
      props: {
        threadKey: "t1",
        onReplyAppended,
      },
    });
    const { flushSync } = await import("svelte");
    flushSync();

    const input = screen.getByTestId("mock-chat-input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Hello world" } });

    const sendBtn = screen.getByTestId("mock-send-btn") as HTMLButtonElement;
    await fireEvent.click(sendBtn);

    // First call: provisional with tmp- key
    await waitFor(() => {
      expect(onReplyAppended).toHaveBeenCalledTimes(2);
    });

    const firstCall = onReplyAppended.mock.calls[0][0] as { reply: { key: string } };
    const secondCall = onReplyAppended.mock.calls[1][0] as {
      reply: { key: string };
      _replaceKey?: string;
    };

    expect(firstCall.reply.key).toMatch(/^tmp-/);
    expect(secondCall.reply.key).toBe("server-id-1");
    expect(secondCall._replaceKey).toMatch(/^tmp-/);

    // After success: input is cleared and submit is not in flight
    expect(input.value).toBe("");
    expect(sendBtn.disabled).toBe(false);
  });

  // Scenario: Submit failure removes the provisional and surfaces the error
  it("calls onReplyRemoved and shows error on failure", async () => {
    await setActiveSesssion(false);

    postReplyMock.mockRejectedValueOnce(new Error("403: Forbidden"));

    const onReplyAppended = vi.fn();
    const onReplyRemoved = vi.fn();
    const { container } = render(ReplyForm, {
      props: {
        threadKey: "t1",
        placeholderText: "Write a reply…",
        frozenNoticeText: "Account frozen.",
        errorText: "Send failed.",
        onReplyAppended,
        onReplyRemoved,
      },
    });
    const { flushSync } = await import("svelte");
    flushSync();

    const input = screen.getByTestId("mock-chat-input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Hello" } });
    await fireEvent.click(screen.getByTestId("mock-send-btn"));

    await waitFor(() => {
      expect(onReplyRemoved).toHaveBeenCalledOnce();
    });

    // Error message shown
    const errorEl = container.querySelector(".reply-form__error");
    expect(errorEl).not.toBeNull();

    // Draft is preserved so user doesn't lose content
    expect(input.value).toBe("Hello");
  });

  // Scenario: Submit is disabled for empty drafts
  it("does not call postReply for empty draft (no input typed)", async () => {
    await setActiveSesssion(false);

    const onReplyAppended = vi.fn();
    render(ReplyForm, {
      props: {
        threadKey: "t1",
        onReplyAppended,
      },
    });
    const { flushSync } = await import("svelte");
    flushSync();

    // Click send without typing anything (value = "")
    await fireEvent.click(screen.getByTestId("mock-send-btn"));

    expect(postReplyMock).not.toHaveBeenCalled();
    expect(onReplyAppended).not.toHaveBeenCalled();
  });

  // Scenario: Submit is disabled for whitespace-only draft
  it("does not call postReply for whitespace-only draft", async () => {
    await setActiveSesssion(false);

    const onReplyAppended = vi.fn();
    render(ReplyForm, {
      props: {
        threadKey: "t1",
        onReplyAppended,
      },
    });
    const { flushSync } = await import("svelte");
    flushSync();

    const input = screen.getByTestId("mock-chat-input");
    await fireEvent.input(input, { target: { value: "   " } });
    await fireEvent.click(screen.getByTestId("mock-send-btn"));

    expect(postReplyMock).not.toHaveBeenCalled();
    expect(onReplyAppended).not.toHaveBeenCalled();
  });
});
