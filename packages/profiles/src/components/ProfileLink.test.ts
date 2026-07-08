// ProfileLink component tests
// Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Anonymous / deleted author falls back without a broken link

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { Profile } from "../server/schemas";
import ProfileLink from "./ProfileLink.svelte";

afterEach(cleanup);

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    key: "uid-a",
    nick: "Ada",
    username: "ada",
    ...overrides,
  };
}

describe("ProfileLink", () => {
  // Scenario: Anonymous / deleted author falls back without a broken link
  it("renders a named anchor when profile is provided", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Anonymous / deleted author falls back without a broken link
    const { container } = render(ProfileLink, {
      props: { profile: makeProfile({ key: "uid-ada", nick: "Ada" }) },
    });
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("/profiles/uid-ada");
    expect(anchor?.textContent).toBe("Ada");
  });

  it("renders no anchor when profile is null (anonymous / deleted author)", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Anonymous / deleted author falls back without a broken link
    const { container } = render(ProfileLink, { props: { profile: null } });
    const anchor = container.querySelector("a");
    expect(anchor).toBeNull();
  });

  it("renders a <span> with anonymous fallback text when profile is null", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Anonymous / deleted author falls back without a broken link
    const { container } = render(ProfileLink, { props: { profile: null } });
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("Anonymous");
  });

  it("never renders a /profiles/- broken link for anonymous users", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Anonymous / deleted author falls back without a broken link
    // owners[0] === "-" is the anonymous sentinel in v17/v20 data.
    const { container } = render(ProfileLink, { props: { profile: null } });
    const brokenLink = container.querySelector('a[href="/profiles/-"]');
    expect(brokenLink).toBeNull();
  });

  it("renders no empty <a> element when profile is null", () => {
    // Verifies: specs/pelilauta/threads/detail-page/sidebar-metadata.md §Anonymous / deleted author falls back without a broken link
    const { container } = render(ProfileLink, { props: { profile: null } });
    const anchors = container.querySelectorAll("a");
    for (const anchor of anchors) {
      expect(anchor.textContent?.trim().length).toBeGreaterThan(0);
    }
  });
});
