// AvatarLink component tests
// Verifies: specs/pelilauta/avatar-link/spec.md §AvatarLink renders an avatar-linked anchor when given a profile
// Verifies: specs/pelilauta/avatar-link/spec.md §AvatarLink renders the bare avatar when profile is nullish
// Verifies: specs/pelilauta/avatar-link/spec.md §AvatarLink defaults size to "small" and forwards an explicit size to CnAvatar
// Verifies: specs/pelilauta/avatar-link/spec.md §AvatarLink omits avatarURL when the profile has none

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { Profile } from "../server/schemas";
import AvatarLink from "./AvatarLink.svelte";

afterEach(cleanup);

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    key: "uid-a",
    nick: "Ada",
    username: "ada",
    avatarURL: "https://x/ada.png",
    ...overrides,
  };
}

describe("AvatarLink", () => {
  // Scenario: AvatarLink renders an avatar-linked anchor when given a profile
  it("renders an anchor targeting /profiles/{key} when profile is given", () => {
    const { container } = render(AvatarLink, {
      props: { profile: makeProfile({ key: "uid-a", nick: "Ada" }) },
    });
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("/profiles/uid-a");
  });

  it("sets aria-label on the anchor to the profile nick", () => {
    const { container } = render(AvatarLink, {
      props: { profile: makeProfile({ key: "uid-a", nick: "Ada" }) },
    });
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("aria-label")).toBe("Ada");
  });

  it("renders CnAvatar inside the anchor with correct nick and src", () => {
    const { container } = render(AvatarLink, {
      props: {
        profile: makeProfile({ key: "uid-a", nick: "Ada", avatarURL: "https://x/ada.png" }),
      },
    });
    const anchor = container.querySelector("a");
    const avatar = anchor?.querySelector(".cn-avatar");
    expect(avatar).not.toBeNull();
    expect(avatar?.getAttribute("data-nick")).toBe("Ada");
    const img = avatar?.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://x/ada.png");
  });

  // Scenario: AvatarLink renders the bare avatar when profile is nullish
  it("renders no anchor when profile is null", () => {
    const { container } = render(AvatarLink, { props: { profile: null } });
    const anchor = container.querySelector("a");
    expect(anchor).toBeNull();
  });

  it("renders a CnAvatar with aria-hidden when profile is null", () => {
    const { container } = render(AvatarLink, { props: { profile: null } });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar).not.toBeNull();
    expect(avatar?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders no anchor when profile prop is omitted", () => {
    const { container } = render(AvatarLink, { props: {} });
    const anchor = container.querySelector("a");
    expect(anchor).toBeNull();
  });

  it("renders a CnAvatar with aria-hidden when profile prop is omitted", () => {
    const { container } = render(AvatarLink, { props: {} });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar).not.toBeNull();
    expect(avatar?.getAttribute("aria-hidden")).toBe("true");
  });

  it("nullish branch forwards no nick or src to CnAvatar", () => {
    const { container } = render(AvatarLink, { props: { profile: null } });
    const avatar = container.querySelector(".cn-avatar");
    // data-nick is only set when nick prop is provided
    expect(avatar?.getAttribute("data-nick")).toBeFalsy();
    // No image rendered
    const img = avatar?.querySelector("img");
    expect(img).toBeNull();
  });

  // Scenario: AvatarLink defaults size to "small" and forwards an explicit size to CnAvatar
  it("defaults size to small when size prop is omitted", () => {
    const { container } = render(AvatarLink, {
      props: { profile: makeProfile({ key: "uid-a", nick: "Ada" }) },
    });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar?.getAttribute("data-size")).toBe("small");
  });

  it("forwards size=medium to CnAvatar when explicitly set", () => {
    const { container } = render(AvatarLink, {
      props: { profile: makeProfile({ key: "uid-a", nick: "Ada" }), size: "medium" },
    });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar?.getAttribute("data-size")).toBe("medium");
  });

  it("nullish branch also uses size=small by default", () => {
    const { container } = render(AvatarLink, { props: { profile: null } });
    const avatar = container.querySelector(".cn-avatar");
    expect(avatar?.getAttribute("data-size")).toBe("small");
  });

  // Scenario: AvatarLink omits avatarURL when the profile has none
  it("renders no img inside CnAvatar when profile has no avatarURL", () => {
    const profile: Profile = { key: "uid-b", nick: "Bob", username: "bob" };
    const { container } = render(AvatarLink, { props: { profile } });
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("/profiles/uid-b");
    const avatar = anchor?.querySelector(".cn-avatar");
    expect(avatar?.getAttribute("data-nick")).toBe("Bob");
    const img = avatar?.querySelector("img");
    expect(img).toBeNull();
  });
});
