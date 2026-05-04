// SiteCard component tests
// Verifies: specs/pelilauta/sites/site-card/spec.md §Renders title, cover, eyebrow link, body, footer
// Verifies: specs/pelilauta/sites/site-card/spec.md §Site without posterURL renders without a cover image
// Verifies: specs/pelilauta/sites/site-card/spec.md §Site without description renders without a body paragraph
// Verifies: specs/pelilauta/sites/site-card/spec.md §Authenticated render emits a MembershipBadge inside actions
// Verifies: specs/pelilauta/sites/site-card/spec.md §Anonymous render emits no badge
// Verifies: specs/pelilauta/sites/site-card/spec.md §Card composes only DS primitives

import { uid } from "@pelilauta/auth/client";
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SiteCard from "./SiteCard.svelte";

afterEach(cleanup);

beforeEach(() => {
  uid.set(null);
});

const baseProps = {
  key: "my-site",
  name: "My RPG Site",
  description: "A great campaign.",
  systemNoun: "dice",
  systemLabel: "D&D 5e",
  systemHref: "/tags/dnd5e",
  coverUrl: "https://example.com/cover.jpg",
  coverSrcset: "https://example.com/cover-400.jpg 400w, https://example.com/cover-800.jpg 800w",
  coverSizes: "(max-width: 768px) 100vw, 450px",
  dateLabel: "2 days ago",
  isAuthenticated: false,
  owners: [] as readonly string[],
  players: [] as readonly string[],
};

describe("SiteCard", () => {
  it("renders title linked to /sites/{key}", () => {
    const { container } = render(SiteCard, { props: baseProps });
    const titleLink = container.querySelector(".title a") as HTMLAnchorElement | null;
    expect(titleLink).not.toBeNull();
    expect(titleLink?.getAttribute("href")).toBe("/sites/my-site");
    expect(titleLink?.textContent?.trim()).toContain("My RPG Site");
  });

  it("renders cover img with src, srcset, sizes, and empty alt", () => {
    const { container } = render(SiteCard, { props: baseProps });
    const img = container.querySelector("img") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/cover.jpg");
    expect(img?.getAttribute("srcset")).toBeTruthy();
    expect(img?.getAttribute("sizes")).toBeTruthy();
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("renders eyebrow link with systemHref and systemLabel", () => {
    const { container } = render(SiteCard, { props: baseProps });
    const eyebrowLink = container.querySelector(".eyebrow a") as HTMLAnchorElement | null;
    expect(eyebrowLink).not.toBeNull();
    expect(eyebrowLink?.getAttribute("href")).toBe("/tags/dnd5e");
    expect(eyebrowLink?.textContent?.trim()).toBe("D&D 5e");
  });

  it("renders description paragraph when description is provided", () => {
    const { container } = render(SiteCard, { props: baseProps });
    const desc = container.querySelector("p.description");
    expect(desc).not.toBeNull();
    expect(desc?.textContent?.trim()).toBe("A great campaign.");
  });

  it("renders dateLabel paragraph in actions area", () => {
    const { container } = render(SiteCard, { props: baseProps });
    const actions = container.querySelector(".actions") as HTMLElement | null;
    expect(actions).not.toBeNull();
    const paragraphs = actions?.querySelectorAll("p");
    const dateP = Array.from(paragraphs ?? []).find((p) => p.textContent?.trim() === "2 days ago");
    expect(dateP).not.toBeNull();
  });

  it("does not render MembershipBadge when isAuthenticated is false", () => {
    // baseProps has isAuthenticated: false — badge must not mount at all
    const { container } = render(SiteCard, { props: baseProps });
    const actions = container.querySelector(".actions") as HTMLElement | null;
    expect(actions).not.toBeNull();
    // No .cn-icon elements inside actions — badge is completely absent
    const icons = actions?.querySelectorAll(".cn-icon");
    expect(icons?.length ?? 0).toBe(0);
  });

  it("renders no <img> when coverUrl is undefined", () => {
    const { container } = render(SiteCard, {
      props: { ...baseProps, coverUrl: undefined, coverSrcset: undefined, coverSizes: undefined },
    });
    const img = container.querySelector("img");
    expect(img).toBeNull();
  });

  it("renders title, eyebrow, and footer even without a cover image", () => {
    const { container } = render(SiteCard, {
      props: { ...baseProps, coverUrl: undefined, coverSrcset: undefined, coverSizes: undefined },
    });
    const titleLink = container.querySelector(".title a");
    expect(titleLink).not.toBeNull();
    const eyebrowLink = container.querySelector(".eyebrow a");
    expect(eyebrowLink).not.toBeNull();
    const actions = container.querySelector(".actions");
    expect(actions).not.toBeNull();
  });

  it("renders no description paragraph when description is undefined", () => {
    const { container } = render(SiteCard, {
      props: { ...baseProps, description: undefined },
    });
    const desc = container.querySelector("p.description");
    expect(desc).toBeNull();
  });

  it("title, eyebrow, cover, and footer still render when description is absent", () => {
    const { container } = render(SiteCard, {
      props: { ...baseProps, description: undefined },
    });
    expect(container.querySelector(".title a")).not.toBeNull();
    expect(container.querySelector(".eyebrow a")).not.toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
    expect(container.querySelector(".actions")).not.toBeNull();
  });

  it("renders MembershipBadge inside actions when isAuthenticated is true", () => {
    // Set uid to "u-alice" so MembershipBadge renders the owner (avatar) icon
    uid.set("u-alice");
    const { container } = render(SiteCard, {
      props: {
        ...baseProps,
        isAuthenticated: true,
        owners: ["u-alice"],
        players: ["u-bob"],
      },
    });
    const actions = container.querySelector(".actions") as HTMLElement | null;
    expect(actions).not.toBeNull();
    // MembershipBadge renders exactly one .cn-icon (the owner avatar icon)
    const icons = actions?.querySelectorAll(".cn-icon");
    expect(icons?.length ?? 0).toBe(1);
    // dateLabel paragraph still renders alongside the badge
    const paragraphs = actions?.querySelectorAll("p");
    const dateP = Array.from(paragraphs ?? []).find((p) => p.textContent?.trim() === "2 days ago");
    expect(dateP).not.toBeNull();
  });

  it("does not mount MembershipBadge when isAuthenticated is false even if a user session is present", () => {
    // uid is a real authenticated user, but the consumer signals "don't mount badge"
    // via isAuthenticated: false. The {#if isAuthenticated} guard must suppress the badge.
    // If the guard were deleted, MembershipBadge would mount and render an icon (uid is in owners).
    uid.set("u-alice");
    const { container } = render(SiteCard, {
      props: {
        ...baseProps,
        isAuthenticated: false,
        owners: ["u-alice"],
        players: [],
      },
    });
    const actions = container.querySelector(".actions") as HTMLElement | null;
    expect(actions).not.toBeNull();
    // Guard suppresses badge — zero .cn-icon elements expected
    const icons = actions?.querySelectorAll(".cn-icon");
    expect(icons?.length ?? 0).toBe(0);
  });

  it("root element is the CnCard article primitive, not a bare div or article by SiteCard", () => {
    const { container } = render(SiteCard, { props: baseProps });
    // CnCard renders an <article class="cn-card ...">
    const article = container.querySelector("article.cn-card");
    expect(article).not.toBeNull();
  });

  it("SiteCard template authors no inline style attributes (DS primitives may use them internally)", () => {
    // Walk the entire rendered subtree and find ALL elements with a style attribute.
    // DS primitive CnIcon legitimately carries style="--icon-dim: ..." as an internal
    // CSS custom-property API — those are filtered out. Everything else must be zero.
    uid.set("u-alice");
    const { container } = render(SiteCard, {
      props: {
        ...baseProps,
        isAuthenticated: true,
        owners: ["u-alice"],
        players: ["u-bob"],
      },
    });
    const styledElements = container.querySelectorAll<HTMLElement>("[style]");
    const nonDsStyled = Array.from(styledElements).filter(
      (el) => !el.classList.contains("cn-icon"),
    );
    expect(nonDsStyled).toHaveLength(0);
  });

  it("rendered card has no app-local utility classes", () => {
    const { container } = render(SiteCard, { props: baseProps });
    // Check that no element carries known v18/app-local utility classes
    const appLocalClasses = ["flex", "flex-col", "downscaled", "toolbar"];
    for (const cls of appLocalClasses) {
      expect(container.querySelector(`.${cls}`)).toBeNull();
    }
  });
});
