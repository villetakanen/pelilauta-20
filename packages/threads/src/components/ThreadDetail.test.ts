// ThreadDetail component tests — specs/pelilauta/threads/spec.md
// Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Single poster renders the single-figure lightbox
// Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Multiple images render the multi-figure strip
// Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Poster combined with images, poster URL not duplicated
// Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Poster URL already present in images is not duplicated
// Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §No cover sources renders no cover area

import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { Thread } from "../schemas/ThreadSchema";
import ThreadDetail from "./ThreadDetail.svelte";

afterEach(cleanup);

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

  // Channel link and author byline are not rendered inside the article body;
  // they live in the sidebar (specs/pelilauta/threads/detail-page/sidebar-metadata.md).
  it("does not render the channel link inside the article body", () => {
    const { container } = render(ThreadDetail, {
      props: { thread: makeThread({ channel: "Pelit" }), bodyHtml: "<p>Body</p>" },
    });
    expect(container.querySelector('a[href="/channels/pelit"]')).toBeNull();
  });

  it("does not render an author byline inside the article body", () => {
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({ owners: ["user1"], author: "user1" }),
        bodyHtml: "<p>Body</p>",
      },
    });
    expect(container.textContent).not.toContain("user1");
    expect(container.textContent).not.toContain("anonymous");
  });

  // Scenario: Single poster renders the single-figure lightbox
  it("renders a single figure with poster src and thread title as caption when only poster is set", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Single poster renders the single-figure lightbox
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({
          title: "My Thread",
          poster: "https://example.com/cover.jpg",
          images: [],
        }),
        bodyHtml: "<p>Body</p>",
      },
    });
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(1);
    const img = figures[0].querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/cover.jpg");
    const caption = figures[0].querySelector("figcaption");
    expect(caption?.textContent).toBe("My Thread");
  });

  it("renders single-figure variant (not multi-figure strip) when only poster is set", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Single poster renders the single-figure lightbox
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({
          poster: "https://example.com/cover.jpg",
          images: [],
        }),
        bodyHtml: "<p>Body</p>",
      },
    });
    // single-figure variant uses class "single-figure", multi-figure uses a flex-container wrapper
    const flexContainer = container.querySelector(".flex-container");
    expect(flexContainer).toBeNull();
    const singleFigure = container.querySelector(".single-figure");
    expect(singleFigure).not.toBeNull();
  });

  // Scenario: Multiple images render the multi-figure strip
  it("renders 3 figures in a multi-figure strip when thread has 3 images and no poster", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Multiple images render the multi-figure strip
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({
          poster: undefined,
          images: [
            { url: "https://example.com/a.jpg", alt: "image a" },
            { url: "https://example.com/b.jpg", alt: "image b" },
            { url: "https://example.com/c.jpg", alt: "image c" },
          ],
        }),
        bodyHtml: "<p>Body</p>",
      },
    });
    const flexContainer = container.querySelector(".flex-container");
    expect(flexContainer).not.toBeNull();
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(3);
    const captions = Array.from(figures).map((f) => f.querySelector("figcaption")?.textContent);
    expect(captions).toEqual(["image a", "image b", "image c"]);
  });

  // Scenario: Poster combined with images, poster URL not duplicated
  it("prepends poster as first figure when poster URL is not in images", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Poster combined with images, poster URL not duplicated
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({
          title: "Cover Thread",
          poster: "https://example.com/cover.jpg",
          images: [{ url: "https://example.com/extra.jpg", alt: "extra" }],
        }),
        bodyHtml: "<p>Body</p>",
      },
    });
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(2);
    const firstImg = figures[0].querySelector("img");
    expect(firstImg?.getAttribute("src")).toBe("https://example.com/cover.jpg");
    const firstCaption = figures[0].querySelector("figcaption");
    expect(firstCaption?.textContent).toBe("Cover Thread");
    const secondImg = figures[1].querySelector("img");
    expect(secondImg?.getAttribute("src")).toBe("https://example.com/extra.jpg");
    const secondCaption = figures[1].querySelector("figcaption");
    expect(secondCaption?.textContent).toBe("extra");
  });

  // Scenario: Poster URL already present in images is not duplicated
  it("does not duplicate the poster URL when it already appears in images", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Poster URL already present in images is not duplicated
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({
          poster: "https://example.com/dup.jpg",
          images: [
            { url: "https://example.com/dup.jpg", alt: "the poster" },
            { url: "https://example.com/other.jpg", alt: "other" },
          ],
        }),
        bodyHtml: "<p>Body</p>",
      },
    });
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(2);
    const srcs = Array.from(figures).map((f) => f.querySelector("img")?.getAttribute("src"));
    expect(srcs.filter((s) => s === "https://example.com/dup.jpg")).toHaveLength(1);
    const firstCaption = figures[0].querySelector("figcaption");
    expect(firstCaption?.textContent).toBe("the poster");
  });

  // Scenario: Poster URL already present in images is not duplicated — dedup at non-first position
  it("dedup matches poster against any position in images, not just index 0", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Poster URL already present in images is not duplicated
    // This test falsifies any implementation that only checks images[0].src === thread.poster.
    const { container } = render(ThreadDetail, {
      props: {
        thread: makeThread({
          poster: "https://example.com/dup.jpg",
          images: [
            { url: "https://example.com/first.jpg", alt: "first" },
            { url: "https://example.com/dup.jpg", alt: "the matching one" },
            { url: "https://example.com/last.jpg", alt: "last" },
          ],
        }),
        bodyHtml: "<p>Body</p>",
      },
    });
    // Exactly 3 figures (no duplicate dup.jpg)
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(3);
    // dup.jpg appears exactly once
    const dupImages = Array.from(figures).flatMap((f) =>
      Array.from(f.querySelectorAll('img[src="https://example.com/dup.jpg"]')),
    );
    expect(dupImages).toHaveLength(1);
  });

  // Scenario: No cover sources renders no cover area
  it("renders no figure and no dialog when both poster and images are absent", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §No cover sources renders no cover area
    const { container } = render(ThreadDetail, {
      props: { thread: makeThread({ poster: undefined, images: [] }), bodyHtml: "<p>Body</p>" },
    });
    const figure = container.querySelector("figure");
    expect(figure).toBeNull();
    const dialog = container.querySelector("dialog");
    expect(dialog).toBeNull();
  });

  // Scenario: No cover sources renders no cover area — images: undefined guard
  it("renders no figure when images is undefined and poster is also absent", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §No cover sources renders no cover area
    // Exercises the `thread.images ?? []` guard branch in the $derived assembly.
    // makeThread always supplies images: [], so bypass it to inject images: undefined.
    const threadWithUndefinedImages = {
      ...makeThread({ poster: undefined }),
      images: undefined,
    } as unknown as import("../schemas/ThreadSchema").Thread;
    const { container } = render(ThreadDetail, {
      props: { thread: threadWithUndefinedImages, bodyHtml: "<p>Body</p>" },
    });
    const figure = container.querySelector("figure");
    expect(figure).toBeNull();
    const dialog = container.querySelector("dialog");
    expect(dialog).toBeNull();
  });

  it("renders exactly one figure with thread title as caption when poster is set but images is undefined", () => {
    // Verifies: specs/pelilauta/threads/detail-page/cover-lightbox.md §Single poster renders the single-figure lightbox
    // When images is undefined (legacy document with no images field) but poster is present,
    // the `?? []` guard ensures the poster entry is still synthesised.
    const threadWithUndefinedImages = {
      ...makeThread({ title: "Legacy Thread", poster: "https://example.com/poster.jpg" }),
      images: undefined,
    } as unknown as import("../schemas/ThreadSchema").Thread;
    const { container } = render(ThreadDetail, {
      props: { thread: threadWithUndefinedImages, bodyHtml: "<p>Body</p>" },
    });
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(1);
    const img = figures[0].querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/poster.jpg");
    const caption = figures[0].querySelector("figcaption");
    expect(caption?.textContent).toBe("Legacy Thread");
  });
});
