// Verifies: specs/pelilauta/front-page/top-threads-stream/spec.md §Empty thread list renders without error
// Verifies: specs/pelilauta/front-page/top-threads-stream/spec.md §Renders the most recent 5 public threads as cards
// Verifies: specs/pelilauta/front-page/top-threads-stream/spec.md §Threads with unknown channel slug render without an icon

import type { LocaleSubstitutions, TFn } from "@pelilauta/i18n";
import type { Profile } from "@pelilauta/profiles/server";
import type { Channel, Thread } from "@pelilauta/threads/server";
import { describe, expect, it, vi } from "vitest";
import { buildTopThreadCards } from "./buildTopThreadCards";

function makeThread(over: Partial<Thread> = {}): Thread {
  return {
    key: "t1",
    locale: "fi",
    title: "T1",
    channel: "yleinen",
    owners: ["u1"],
    author: "u1",
    public: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    flowTime: 0,
    markdownContent: "",
    replyCount: 0,
    lovedCount: 0,
    images: [],
    ...over,
  };
}

const yleinenChannel: Channel = {
  slug: "yleinen",
  name: "Yleinen",
  description: "",
  icon: "discussion",
  threadCount: 0,
  flowTime: 0,
};

const fakeT: TFn = (key: string, subs?: LocaleSubstitutions) => {
  if (key === "threads:thread.inChannel" && subs?.topic !== undefined) {
    return `In ${subs.topic}`;
  }
  return key;
};

describe("buildTopThreadCards", () => {
  it("returns an empty array when threads is empty", () => {
    expect(buildTopThreadCards([], [yleinenChannel], [], fakeT)).toEqual([]);
  });

  it("preserves caller-controlled order across the mapping", () => {
    const threads = [
      makeThread({ key: "a", flowTime: 3 }),
      makeThread({ key: "b", flowTime: 2 }),
      makeThread({ key: "c", flowTime: 1 }),
    ];
    const cards = buildTopThreadCards(threads, [yleinenChannel], [null, null, null], fakeT);
    expect(cards.map((c) => c.thread.key)).toEqual(["a", "b", "c"]);
  });

  it("emits one card per thread (5 in → 5 out)", () => {
    const threads = Array.from({ length: 5 }, (_, i) => makeThread({ key: `t${i}` }));
    const cards = buildTopThreadCards(threads, [yleinenChannel], Array(5).fill(null), fakeT);
    expect(cards).toHaveLength(5);
  });

  it("resolves channelIcon from the matching channel", () => {
    const cards = buildTopThreadCards([makeThread()], [yleinenChannel], [null], fakeT);
    expect(cards[0].channelIcon).toBe("discussion");
  });

  it("omits channelIcon when the channel slug does not resolve", () => {
    const cards = buildTopThreadCards(
      [makeThread({ channel: "ghost" })],
      [yleinenChannel],
      [null],
      fakeT,
    );
    expect(cards[0].channelIcon).toBeUndefined();
  });

  it("substitutes channel.name into the link label when the channel resolves", () => {
    const cards = buildTopThreadCards([makeThread()], [yleinenChannel], [null], fakeT);
    expect(cards[0].channelLinkLabel).toBe("In Yleinen");
  });

  it("falls the link label back to the slug when the channel is unknown", () => {
    const cards = buildTopThreadCards(
      [makeThread({ channel: "ghost" })],
      [yleinenChannel],
      [null],
      fakeT,
    );
    expect(cards[0].channelLinkLabel).toBe("In ghost");
  });

  it("calls t with threads:thread.inChannel and the resolved topic for each thread", () => {
    const tSpy = vi.fn(fakeT);
    buildTopThreadCards(
      [makeThread({ channel: "yleinen" }), makeThread({ channel: "ghost" })],
      [yleinenChannel],
      [null, null],
      tSpy,
    );
    expect(tSpy).toHaveBeenCalledWith("threads:thread.inChannel", { topic: "Yleinen" });
    expect(tSpy).toHaveBeenCalledWith("threads:thread.inChannel", { topic: "ghost" });
  });

  it("uses thread.poster as coverUrl when present", () => {
    const cards = buildTopThreadCards(
      [makeThread({ poster: "https://example.com/poster.jpg" })],
      [yleinenChannel],
      [null],
      fakeT,
    );
    expect(cards[0].coverUrl).toBe("https://example.com/poster.jpg");
  });

  it("falls coverUrl back to the first image url when poster is missing", () => {
    const cards = buildTopThreadCards(
      [makeThread({ images: [{ url: "https://example.com/img.jpg", alt: "" }] })],
      [yleinenChannel],
      [null],
      fakeT,
    );
    expect(cards[0].coverUrl).toBe("https://example.com/img.jpg");
  });

  it("passes authorProfiles through positionally", () => {
    const profile: Profile = { key: "u1", nick: "Ada", username: "ada" };
    const cards = buildTopThreadCards(
      [makeThread(), makeThread({ key: "t2" })],
      [yleinenChannel],
      [profile, null],
      fakeT,
    );
    expect(cards[0].authorProfile).toBe(profile);
    expect(cards[1].authorProfile).toBeNull();
  });

  it("renders the snippet from markdownContent", () => {
    const cards = buildTopThreadCards(
      [makeThread({ markdownContent: "# Title\n\nBody **bold** text." })],
      [yleinenChannel],
      [null],
      fakeT,
    );
    expect(cards[0].snippet).toContain("Title");
    expect(cards[0].snippet).toContain("Body");
    expect(cards[0].snippet).not.toContain("**");
  });
});
