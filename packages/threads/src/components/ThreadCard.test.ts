// ThreadCard component tests
// Verifies: specs/pelilauta/front-page/top-threads-stream/thread-card.md §ThreadCard composes ProfileLink for the author byline in the actions slot
// Verifies: specs/pelilauta/front-page/top-threads-stream/thread-card.md §ThreadCard composes the channel link into CnCard's eyebrow slot
// Verifies: specs/pelilauta/front-page/top-threads-stream/thread-card.md §ThreadCard renders dateLabel beside the byline
// Verifies: specs/pelilauta/front-page/top-threads-stream/thread-card.md §ThreadCard renders the reply-count link

import type { Profile } from "@pelilauta/profiles/server";
import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { Thread } from "../schemas/ThreadSchema";
import ThreadCard from "./ThreadCard.svelte";

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

const baseProps = {
  channelSlug: "yleinen",
  channelLinkLabel: "In Yleinen",
  anonymousLabel: "Anonymous",
  dateLabel: "2026-04-30",
};

describe("ThreadCard", () => {
  it("renders the thread title", () => {
    render(ThreadCard, { props: { thread: makeThread(), ...baseProps } });
    expect(screen.getByText("Test Thread")).toBeTruthy();
  });

  it("links to the thread detail page", () => {
    render(ThreadCard, {
      props: { thread: makeThread({ key: "abc" }), ...baseProps },
    });
    const links = screen.getAllByRole("link", { name: /Test Thread/ });
    expect(links.some((link) => link.getAttribute("href") === "/threads/abc")).toBe(true);
  });

  it("stamps lang attribute from thread.locale", () => {
    const { container } = render(ThreadCard, {
      props: { thread: makeThread({ locale: "en" }), ...baseProps },
    });
    const wrapper = container.querySelector("[lang]");
    expect(wrapper?.getAttribute("lang")).toBe("en");
  });

  it("renders the snippet prop verbatim", () => {
    render(ThreadCard, {
      props: { thread: makeThread(), snippet: "Some bold text", ...baseProps },
    });
    expect(screen.getByText("Some bold text")).toBeTruthy();
  });

  it("omits the snippet paragraph when snippet is empty or absent", () => {
    const { container } = render(ThreadCard, {
      props: { thread: makeThread(), snippet: "", ...baseProps },
    });
    // Byline p is in nav.actions, not .card-info — so .card-info should have no <p>
    const cardInfo = container.querySelector(".card-info");
    const paragraphsInCardInfo = cardInfo?.querySelectorAll("p") ?? [];
    expect(paragraphsInCardInfo.length).toBe(0);
    // Byline <p> should still exist in nav.actions
    const actionsP = container.querySelector("nav.actions p");
    expect(actionsP).not.toBeNull();
  });

  it("renders the channel link inside CnCard's eyebrow slot, not a <p>", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread({ channel: "pelit" }),
        channelSlug: "pelit",
        channelLinkLabel: "In Pelit",
        anonymousLabel: "Anonymous",
        dateLabel: "2026-04-30",
      },
    });
    const eyebrow = container.querySelector(".eyebrow");
    expect(eyebrow).not.toBeNull();
    const link = eyebrow?.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/channels/pelit");
    expect(link?.textContent).toBe("In Pelit");
  });

  it("renders the channel link with the channelLinkLabel and channelSlug props", () => {
    render(ThreadCard, {
      props: {
        thread: makeThread({ channel: "pelit" }),
        channelSlug: "pelit",
        channelLinkLabel: "In Pelit",
        anonymousLabel: "Anonymous",
        dateLabel: "2026-04-30",
      },
    });
    const link = screen.getByRole("link", { name: "In Pelit" });
    expect(link.getAttribute("href")).toBe("/channels/pelit");
  });

  it("passes coverUrl to CnCard as the cover image source", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread(),
        coverUrl: "https://example.com/poster.jpg",
        ...baseProps,
      },
    });
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/poster.jpg");
  });

  it("renders no cover image when coverUrl is undefined", () => {
    const { container } = render(ThreadCard, {
      props: { thread: makeThread(), ...baseProps },
    });
    const img = container.querySelector("img");
    expect(img).toBeNull();
  });

  it("composes ProfileLink as a profile anchor when authorProfile is given", () => {
    const authorProfile: Profile = { key: "uid-a", nick: "Ada", username: "ada" };
    render(ThreadCard, {
      props: {
        thread: makeThread({ author: "uid-a", owners: ["uid-a"] }),
        authorProfile,
        ...baseProps,
      },
    });

    const bylineLink = screen.getByRole("link", { name: "Ada" });
    expect(bylineLink.getAttribute("href")).toBe("/profiles/uid-a");
  });

  it("composes ProfileLink as the anonymous fallback when authorProfile is null", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread({ author: "-", owners: ["-"] }),
        authorProfile: null,
        ...baseProps,
      },
    });

    expect(screen.getByText("Anonymous")).toBeTruthy();
    const profileLinks = container.querySelectorAll('a[href^="/profiles/"]');
    expect(profileLinks.length).toBe(0);
  });

  it("renders dateLabel as the second line of the byline paragraph", () => {
    const { container } = render(ThreadCard, {
      props: { thread: makeThread(), ...baseProps, dateLabel: "2 days ago" },
    });
    const actionsP = container.querySelector("nav.actions p");
    expect(actionsP).not.toBeNull();
    // Must contain a <br> element
    expect(actionsP?.querySelector("br")).not.toBeNull();
    // Must contain the dateLabel text
    expect(actionsP?.textContent).toContain("2 days ago");
  });

  it("renders the reply-count link in the actions slot", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread({ key: "thread-a", replyCount: 4 }),
        ...baseProps,
      },
    });
    const link = container.querySelector('nav.actions a[href="/threads/thread-a"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("4");
  });

  it("renders the reply-count link with 0 when replyCount is undefined", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread({ key: "thread-b", replyCount: undefined }),
        ...baseProps,
      },
    });
    const link = container.querySelector('nav.actions a[href="/threads/thread-b"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("0");
  });

  it("the reply-count link target has no anchor and no query string", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread({ key: "thread-a", replyCount: 4 }),
        ...baseProps,
      },
    });
    const link = container.querySelector('nav.actions a[href="/threads/thread-a"]');
    const href = link?.getAttribute("href") ?? "";
    expect(href).toBe("/threads/thread-a");
    expect(href).not.toContain("#");
    expect(href).not.toContain("?");
  });

  it("places the byline and reply-count as direct children of nav.actions", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread({ key: "thread-a", replyCount: 4 }),
        ...baseProps,
      },
    });
    const nav = container.querySelector("nav.actions");
    expect(nav).not.toBeNull();
    const directChildren = Array.from(nav?.children ?? []);
    expect(directChildren).toHaveLength(2);
    expect(directChildren[0].tagName.toLowerCase()).toBe("p");
    expect(directChildren[1].tagName.toLowerCase()).toBe("a");
  });
});
