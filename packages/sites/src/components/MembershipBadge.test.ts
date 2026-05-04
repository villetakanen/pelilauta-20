// MembershipBadge component tests
// Verifies: specs/pelilauta/sites/membership-badge/spec.md §Owner viewer sees the owner icon
// Verifies: specs/pelilauta/sites/membership-badge/spec.md §Player viewer (not owner) sees the player icon
// Verifies: specs/pelilauta/sites/membership-badge/spec.md §Viewer in both arrays sees only the owner icon
// Verifies: specs/pelilauta/sites/membership-badge/spec.md §Stranger viewer sees nothing
// Verifies: specs/pelilauta/sites/membership-badge/spec.md §No viewer (no session) sees nothing

import { uid } from "@pelilauta/auth/client";
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import MembershipBadge from "./MembershipBadge.svelte";

afterEach(cleanup);

beforeEach(() => {
  uid.set(null);
});

describe("MembershipBadge", () => {
  it("owner viewer sees the owner icon (avatar) and no meeple icon", () => {
    uid.set("u-alice");
    const { container } = render(MembershipBadge, {
      props: { owners: ["u-alice"], players: ["u-alice", "u-bob"] },
    });
    const icons = container.querySelectorAll(".cn-icon");
    expect(icons.length).toBe(1);
    expect(icons[0].getAttribute("data-noun")).toBe("avatar");
    expect(container.querySelector('[data-noun="meeple"]')).toBeNull();
  });

  it("player viewer (not owner) sees the meeple icon and no avatar icon", () => {
    uid.set("u-bob");
    const { container } = render(MembershipBadge, {
      props: { owners: ["u-alice"], players: ["u-bob"] },
    });
    const icons = container.querySelectorAll(".cn-icon");
    expect(icons.length).toBe(1);
    expect(icons[0].getAttribute("data-noun")).toBe("meeple");
    expect(container.querySelector('[data-noun="avatar"]')).toBeNull();
  });

  it("viewer in both arrays sees only the owner icon (avatar), no meeple icon", () => {
    uid.set("u-alice");
    const { container } = render(MembershipBadge, {
      props: { owners: ["u-alice"], players: ["u-alice"] },
    });
    const icons = container.querySelectorAll(".cn-icon");
    expect(icons.length).toBe(1);
    expect(icons[0].getAttribute("data-noun")).toBe("avatar");
    expect(container.querySelector('[data-noun="meeple"]')).toBeNull();
  });

  it("stranger viewer sees nothing (no icon rendered)", () => {
    uid.set("u-charlie");
    const { container } = render(MembershipBadge, {
      props: { owners: ["u-alice"], players: ["u-bob"] },
    });
    expect(container.querySelectorAll(".cn-icon").length).toBe(0);
  });

  it("no viewer (no session) sees nothing (no icon rendered)", () => {
    uid.set(null);
    const { container } = render(MembershipBadge, {
      props: { owners: ["u-alice"], players: ["u-bob"] },
    });
    expect(container.querySelectorAll(".cn-icon").length).toBe(0);
  });
});
