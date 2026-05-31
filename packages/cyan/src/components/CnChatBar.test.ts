// Unit tests verify only what jsdom can faithfully observe: rendered DOM
// structure, prop→attribute mapping, slot composition, and keyboard handler
// logic (keydown events run synchronously in jsdom). Computed-style assertions
// (max-height in lines, overflow-y scrollbar, light-dark token resolution)
// require a real CSS layout engine and are covered by the e2e spec at
// app/cyan-ds/e2e/components/cn-chat-bar.spec.ts.
//
// Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Enter triggers send event
// Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Shift+Enter inserts newline
// Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Textarea grows with input

import { fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import CnChatBar from "./CnChatBar.svelte";

describe("CnChatBar structure", () => {
  it("renders a <div> root with the cn-chat-bar class", () => {
    const { container } = render(CnChatBar);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.classList.contains("cn-chat-bar")).toBe(true);
  });

  it("contains a <textarea> element", () => {
    const { container } = render(CnChatBar);
    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();
  });

  it("applies the placeholder prop to the textarea", () => {
    const { container } = render(CnChatBar, { props: { placeholder: "Say something…" } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe("Say something…");
  });

  it("applies the disabled prop to the textarea", () => {
    const { container } = render(CnChatBar, { props: { disabled: true } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it("adds the disabled class to the root when disabled is true", () => {
    const { container } = render(CnChatBar, { props: { disabled: true } });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains("disabled")).toBe(true);
  });

  it("does not add the disabled class when disabled is false (default)", () => {
    const { container } = render(CnChatBar);
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains("disabled")).toBe(false);
  });
});

describe("CnChatBar slot composition", () => {
  it("renders the start slot inside .cn-chat-bar__slot--start", () => {
    const startSnippet = createRawSnippet(() => ({ render: () => "<button>attach</button>" }));
    const { container } = render(CnChatBar, { props: { start: startSnippet } });
    const startSlot = container.querySelector(".cn-chat-bar__slot--start");
    expect(startSlot).not.toBeNull();
    expect(startSlot?.querySelector("button")?.textContent).toBe("attach");
  });

  it("renders the end slot inside .cn-chat-bar__slot--end", () => {
    const endSnippet = createRawSnippet(() => ({ render: () => "<button>send</button>" }));
    const { container } = render(CnChatBar, { props: { end: endSnippet } });
    const endSlot = container.querySelector(".cn-chat-bar__slot--end");
    expect(endSlot).not.toBeNull();
    expect(endSlot?.querySelector("button")?.textContent).toBe("send");
  });

  it("omits .cn-chat-bar__slot--start when no start snippet is provided", () => {
    const { container } = render(CnChatBar);
    expect(container.querySelector(".cn-chat-bar__slot--start")).toBeNull();
  });

  it("omits .cn-chat-bar__slot--end when no end snippet is provided", () => {
    const { container } = render(CnChatBar);
    expect(container.querySelector(".cn-chat-bar__slot--end")).toBeNull();
  });
});

// Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Enter triggers send event
describe("CnChatBar keyboard: Enter triggers send", () => {
  it("calls onsend with the current value when Enter is pressed with non-empty input", () => {
    const onsend = vi.fn();
    const { container } = render(CnChatBar, { props: { value: "Hello world", onsend } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onsend).toHaveBeenCalledOnce();
    expect(onsend).toHaveBeenCalledWith("Hello world");
  });

  it("prevents the default action when Enter is pressed with non-empty input", () => {
    const onsend = vi.fn();
    const { container } = render(CnChatBar, { props: { value: "Hello world", onsend } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not call onsend when Enter is pressed with an empty value", () => {
    const onsend = vi.fn();
    const { container } = render(CnChatBar, { props: { value: "", onsend } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onsend).not.toHaveBeenCalled();
  });

  it("does not call onsend when Enter is pressed with a whitespace-only value", () => {
    const onsend = vi.fn();
    const { container } = render(CnChatBar, { props: { value: "   ", onsend } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onsend).not.toHaveBeenCalled();
  });
});

// Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Shift+Enter inserts newline
describe("CnChatBar keyboard: Shift+Enter does not send", () => {
  it("does not call onsend when Shift+Enter is pressed", () => {
    const onsend = vi.fn();
    const { container } = render(CnChatBar, { props: { value: "Hello", onsend } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onsend).not.toHaveBeenCalled();
  });

  it("does not prevent default when Shift+Enter is pressed (allows newline insertion)", () => {
    const { container } = render(CnChatBar, { props: { value: "Hello" } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

// Verifies: specs/cyan-ds/components/cn-chat-bar/spec.md §Textarea grows with input
describe("CnChatBar textarea auto-expand", () => {
  // NOTE: jsdom does not implement layout (scrollHeight, computed style max-height,
  // overflow-y scrollbar visibility). The CSS-driven auto-expand (field-sizing: content,
  // max-height: calc(4 * 1.5em)) and the mobile viewport cap (40vh) are verified by
  // the e2e spec at app/cyan-ds/e2e/components/cn-chat-bar.spec.ts.

  it("textarea has rows='1' as initial size hint", () => {
    const { container } = render(CnChatBar);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.rows).toBe(1);
  });

  it("textarea does not have a resize style attribute set to 'vertical' or 'both'", () => {
    const { container } = render(CnChatBar);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    // The component sets resize:none via CSS; jsdom won't resolve the stylesheet
    // but we can confirm no inline resize override was set.
    expect(textarea.style.resize).not.toBe("vertical");
    expect(textarea.style.resize).not.toBe("both");
  });
});
