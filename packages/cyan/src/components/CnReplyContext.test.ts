// Unit tests verify only what jsdom can faithfully observe: rendered DOM
// structure, prop→DOM mapping, avatar instantiation, and dismiss callback.
// Computed-style assertions (text-overflow, ellipsis truncation, light-dark
// token resolution) require a real CSS layout engine and are covered by the
// e2e spec at app/cyan-ds/e2e/components/cn-reply-context.spec.ts.
//
// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders username and text snippet
// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders avatar when provided
// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Clicking close triggers dismiss event

import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CnReplyContext from "./CnReplyContext.svelte";

// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders username and text snippet
describe("CnReplyContext structure", () => {
  it("renders a <div> root with the cn-reply-context class", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "Let's start the game" },
    });
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.classList.contains("cn-reply-context")).toBe(true);
  });

  it("renders the username prefixed with @", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "Let's start the game" },
    });
    const username = container.querySelector(".cn-reply-context__username");
    expect(username).not.toBeNull();
    expect(username?.textContent).toBe("@tapa");
  });

  it("renders the text snippet", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "Let's start the game" },
    });
    const snippet = container.querySelector(".cn-reply-context__snippet");
    expect(snippet).not.toBeNull();
    expect(snippet?.textContent).toBe("Let's start the game");
  });

  it("renders a dismiss button with accessible label", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "Let's start the game" },
    });
    const button = container.querySelector(".cn-reply-context__dismiss");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toBe("Dismiss reply to @tapa");
    expect((button as HTMLButtonElement)?.type).toBe("button");
  });
});

// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Renders avatar when provided
describe("CnReplyContext avatar", () => {
  it("renders a cn-avatar element", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "hello", avatarUrl: "https://example.com/avatar.jpg" },
    });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar).not.toBeNull();
  });

  it("passes avatarUrl as src to CnAvatar (img src attribute is set)", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "hello", avatarUrl: "https://example.com/avatar.jpg" },
    });
    const img = container.querySelector(".cn-avatar img") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.src).toContain("example.com/avatar.jpg");
  });

  it("passes nick to CnAvatar so initials render when no avatarUrl", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "hello" },
    });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar).not.toBeNull();
    // data-nick is set by CnAvatar when nick prop is supplied
    expect(avatar?.getAttribute("data-nick")).toBe("tapa");
  });

  it("renders a cn-avatar even without avatarUrl (initials fallback)", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "hello" },
    });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar).not.toBeNull();
    const initials = container.querySelector(".cn-avatar__initials");
    expect(initials?.textContent?.trim()).toBe("TA");
  });
});

// Verifies: specs/cyan-ds/components/cn-reply-context/spec.md §Clicking close triggers dismiss event
describe("CnReplyContext dismiss callback", () => {
  it("calls ondismiss when the dismiss button is clicked", () => {
    const ondismiss = vi.fn();
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "Let's start the game", ondismiss },
    });
    const button = container.querySelector(".cn-reply-context__dismiss") as HTMLButtonElement;
    fireEvent.click(button);
    expect(ondismiss).toHaveBeenCalledOnce();
  });

  it("does not throw when ondismiss is not provided and button is clicked", () => {
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "Let's start the game" },
    });
    const button = container.querySelector(".cn-reply-context__dismiss") as HTMLButtonElement;
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  it("does not call ondismiss unless button is clicked", () => {
    const ondismiss = vi.fn();
    render(CnReplyContext, {
      props: { user: "tapa", text: "Let's start the game", ondismiss },
    });
    expect(ondismiss).not.toHaveBeenCalled();
  });

  it("can call ondismiss multiple times on repeated clicks", () => {
    const ondismiss = vi.fn();
    const { container } = render(CnReplyContext, {
      props: { user: "tapa", text: "Let's start the game", ondismiss },
    });
    const button = container.querySelector(".cn-reply-context__dismiss") as HTMLButtonElement;
    fireEvent.click(button);
    fireEvent.click(button);
    expect(ondismiss).toHaveBeenCalledTimes(2);
  });
});

// NOTE: Text truncation CSS (overflow:hidden; white-space:nowrap; text-overflow:ellipsis)
// cannot be verified in jsdom because jsdom does not implement CSS layout.
// That scenario is covered by app/cyan-ds/e2e/components/cn-reply-context.spec.ts.
