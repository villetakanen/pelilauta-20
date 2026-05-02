// ThreadCard component tests — specs/pelilauta/front-page/top-threads-stream/thread-card.md
// Verifies:
//   §ThreadCard composes ProfileLink for the author byline
//   §ThreadCard composes the channel link into CnCard's eyebrow slot

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
    const paragraphs = container.querySelectorAll("p");
    // Byline paragraph only; channel link lives in the eyebrow slot, not a <p>.
    expect(paragraphs.length).toBe(1);
  });

  it("renders the channel link inside CnCard's eyebrow slot, not a <p>", () => {
    const { container } = render(ThreadCard, {
      props: {
        thread: makeThread({ channel: "pelit" }),
        channelSlug: "pelit",
        channelLinkLabel: "In Pelit",
        anonymousLabel: "Anonymous",
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
});
