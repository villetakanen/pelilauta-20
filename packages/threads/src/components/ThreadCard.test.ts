// ThreadCard component tests — specs/pelilauta/threads/spec.md

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { Thread } from "../schemas/ThreadSchema";
import ThreadCard from "./ThreadCard.svelte";

function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    key: "t1",
    locale: "fi",
    title: "Test Thread",
    channel: "yleinen",
    owners: ["user1"],
    author: "user1",
    public: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    flowTime: Date.now(),
    markdownContent: "Hello **world**",
    replyCount: 0,
    lovedCount: 0,
    images: [],
    ...overrides,
  };
}

describe("ThreadCard", () => {
  it("renders the thread title", () => {
    render(ThreadCard, { props: { thread: makeThread() } });
    expect(screen.getByText("Test Thread")).toBeTruthy();
  });

  it("links to the thread detail page", () => {
    render(ThreadCard, { props: { thread: makeThread({ key: "abc" }) } });
    const links = screen.getAllByRole("link", { name: /Test Thread/ });
    expect(links.some((link) => link.getAttribute("href") === "/threads/abc")).toBe(true);
  });

  it("stamps lang attribute from thread.locale", () => {
    const { container } = render(ThreadCard, {
      props: { thread: makeThread({ locale: "en" }) },
    });
    const wrapper = container.querySelector("[lang]");
    expect(wrapper?.getAttribute("lang")).toBe("en");
  });

  it("renders a plain-text snippet from markdownContent", () => {
    render(ThreadCard, {
      props: { thread: makeThread({ markdownContent: "# Heading\n\nSome **bold** text" }) },
    });
    expect(screen.getByText(/Some bold text/)).toBeTruthy();
  });

  it("renders only the channel link paragraph when markdownContent is empty", () => {
    const { container } = render(ThreadCard, {
      props: { thread: makeThread({ markdownContent: "" }) },
    });
    const paragraphs = container.querySelectorAll("p");
    // Only the channel link paragraph, no snippet paragraph
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0]?.querySelector("a")).toBeTruthy();
  });

  it("truncates long snippets with ellipsis", () => {
    const longContent = "A ".repeat(200);
    render(ThreadCard, {
      props: { thread: makeThread({ markdownContent: longContent }) },
    });
    const text = screen.getByText(/\u2026$/);
    expect(text).toBeTruthy();
  });

  it("renders a channel link to /channels/{slug}", () => {
    render(ThreadCard, {
      props: { thread: makeThread({ channel: "Pelit" }) },
    });
    const link = screen.getByRole("link", { name: "Pelit" });
    expect(link.getAttribute("href")).toBe("/channels/pelit");
  });

  it("passes poster as cover to CnCard", () => {
    const { container } = render(ThreadCard, {
      props: { thread: makeThread({ poster: "https://example.com/poster.jpg" }) },
    });
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/poster.jpg");
  });

  it("falls back to first image when no poster", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread({
          poster: undefined,
          images: [{ url: "https://example.com/img.jpg", alt: "test" }],
        }),
      },
    });
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/img.jpg");
  });

  it("renders no cover image when neither poster nor images exist", () => {
    const { container } = render(ThreadCard, {
      props: { thread: makeThread({ poster: undefined, images: [] }) },
    });
    const img = container.querySelector("img");
    expect(img).toBeNull();
  });
});
