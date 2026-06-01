// ReplyArticle component tests
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Own replies render with the reply bubble variant

import type { Profile } from "@pelilauta/profiles/server";
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { Reply } from "../schemas/ReplySchema";
import ReplyArticle from "./ReplyArticle.svelte";

afterEach(cleanup);

function makeReply(overrides: Partial<Reply> = {}): Reply {
  return {
    key: "r1",
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

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    key: "user1",
    nick: "Ada",
    username: "ada",
    avatarURL: "https://x/ada.png",
    ...overrides,
  };
}

describe("ReplyArticle", () => {
  // Scenario: ReplyArticle composes its DS primitives without async work
  it("renders an article with id=reply.key", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply({ key: "r1" }),
        bodyHtml: "<p>hi</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const article = container.querySelector("article#r1");
    expect(article).not.toBeNull();
  });

  it("article carries aria-labelledby=reply-author-{key}", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply({ key: "r1" }),
        bodyHtml: "<p>hi</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const article = container.querySelector("article");
    expect(article?.getAttribute("aria-labelledby")).toBe("reply-author-r1");
  });

  it("the element referenced by aria-labelledby exists in the DOM", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    // Regression guard: aria-labelledby must point to a real DOM element so screen readers
    // can derive the article's accessible name. Without the wrapping <span>, ProfileLink
    // silently drops the id prop and the reference is broken.
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply({ key: "r1" }),
        bodyHtml: "<p>hi</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const article = container.querySelector("article");
    const labelId = article?.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(container.querySelector(`#${labelId}`)).not.toBeNull();
  });

  it("renders a cn-bubble element", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply(),
        bodyHtml: "<p>hi</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const bubble = container.querySelector(".cn-bubble");
    expect(bubble).not.toBeNull();
  });

  it("renders ProfileLink as an anchor to /profiles/{key}", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply(),
        bodyHtml: "<p>hi</p>",
        profile: makeProfile({ key: "uid-a", nick: "Ada" }),
        fromUser: false,
      },
    });
    const link = container.querySelector('a[href="/profiles/uid-a"]');
    expect(link).not.toBeNull();
  });

  it("renders AvatarLink cn-avatar element", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply(),
        bodyHtml: "<p>hi</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar).not.toBeNull();
  });

  it("renders bodyHtml as inner HTML", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply(),
        bodyHtml: "<p>hi</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const p = container.querySelector("p");
    expect(p?.textContent).toBe("hi");
  });

  it("renders CnLightbox when reply has images", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply({ images: [{ url: "https://x", alt: "y" }] }),
        bodyHtml: "<p>img test</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    // CnLightbox renders a figure when images are present
    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();
    const img = container.querySelector("figure img");
    expect(img?.getAttribute("src")).toBe("https://x");
  });

  it("maps images from {url, alt} to {src, caption} for CnLightbox", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply({ images: [{ url: "https://x", alt: "y" }] }),
        bodyHtml: "<p>hi</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const img = container.querySelector("figure img");
    expect(img?.getAttribute("src")).toBe("https://x");
    const caption = container.querySelector("figcaption");
    expect(caption?.textContent).toBe("y");
  });

  it("does NOT render CnLightbox when reply has no images", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §ReplyArticle is a pure render
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply({ images: [] }),
        bodyHtml: "<p>no imgs</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const figure = container.querySelector("figure");
    expect(figure).toBeNull();
  });

  // Scenario: ReplyArticle uses the reply variant of CnBubble when fromUser is true
  it("adds reply class to cn-bubble when fromUser=true", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Own replies render with the reply bubble variant
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply(),
        bodyHtml: "<p>own reply</p>",
        profile: makeProfile(),
        fromUser: true,
      },
    });
    const bubble = container.querySelector(".cn-bubble");
    expect(bubble?.classList.contains("reply")).toBe(true);
  });

  it("does NOT add reply class to cn-bubble when fromUser=false", () => {
    // Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §Own replies render with the reply bubble variant
    const { container } = render(ReplyArticle, {
      props: {
        reply: makeReply(),
        bodyHtml: "<p>other reply</p>",
        profile: makeProfile(),
        fromUser: false,
      },
    });
    const bubble = container.querySelector(".cn-bubble");
    expect(bubble?.classList.contains("reply")).toBe(false);
  });
});
