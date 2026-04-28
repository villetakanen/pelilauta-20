// ThreadDetail component tests — specs/pelilauta/threads/spec.md

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { Thread } from "../schemas/ThreadSchema";
import ThreadDetail from "./ThreadDetail.svelte";

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

describe("ThreadDetail", () => {
  it("renders the thread title in an h1", () => {
    render(ThreadDetail, {
      props: { thread: makeThread({ title: "Test Thread" }), bodyHtml: "<p>Body</p>" },
    });
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Test Thread");
  });

  it("renders a channel link to /channels/{slug}", () => {
    render(ThreadDetail, {
      props: { thread: makeThread({ channel: "Pelit" }), bodyHtml: "<p>Body</p>" },
    });
    const link = screen.getByRole("link", { name: "Pelit" });
    expect(link.getAttribute("href")).toBe("/channels/pelit");
  });

  it("stamps lang attribute from thread.locale", () => {
    const { container } = render(ThreadDetail, {
      props: { thread: makeThread({ locale: "en" }), bodyHtml: "<p>Body</p>" },
    });
    const article = container.querySelector("article");
    expect(article?.getAttribute("lang")).toBe("en");
  });

  it("renders the body html via {@html bodyHtml}", () => {
    const { container } = render(ThreadDetail, {
      props: { thread: makeThread(), bodyHtml: "<p>Hello <strong>world</strong></p>" },
    });
    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
  });

  it("shows anonymous byline when author is the '-' sentinel", () => {
    const { container } = render(ThreadDetail, {
      props: { thread: makeThread({ author: "-" }), bodyHtml: "<p>Body</p>" },
    });
    expect(container.textContent).toContain("anonymous");
  });

  it("shows anonymous byline when author is missing", () => {
    const { container } = render(ThreadDetail, {
      // biome-ignore lint/suspicious/noExplicitAny: testing missing-author edge case
      props: { thread: makeThread({ author: undefined as any }), bodyHtml: "<p>Body</p>" },
    });
    expect(container.textContent).toContain("anonymous");
  });

  it("shows the uid when author is a real value", () => {
    const { container } = render(ThreadDetail, {
      props: { thread: makeThread({ author: "user1" }), bodyHtml: "<p>Body</p>" },
    });
    expect(container.textContent).toContain("user1");
    expect(container.textContent).not.toContain("anonymous");
  });

  it("prefers poster over images[0] for the cover", () => {
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({
          poster: "https://example.com/poster.jpg",
          images: [{ url: "https://example.com/img.jpg", alt: "alt" }],
        }),
        bodyHtml: "<p>Body</p>",
      },
    });
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/poster.jpg");
  });

  it("falls back to images[0].url when no poster", () => {
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({
          poster: undefined,
          images: [{ url: "https://example.com/img.jpg", alt: "alt" }],
        }),
        bodyHtml: "<p>Body</p>",
      },
    });
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/img.jpg");
  });

  it("renders no cover image when neither poster nor images exist", () => {
    const { container } = render(ThreadDetail, {
      props: { thread: makeThread({ poster: undefined, images: [] }), bodyHtml: "<p>Body</p>" },
    });
    const img = container.querySelector("img");
    expect(img).toBeNull();
  });
});
