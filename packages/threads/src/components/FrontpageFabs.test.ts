// FrontpageFabs component tests
//
// Component is host-gated: index.astro mounts FrontpageFabs only on the authenticated
// branch (uid truthy at SSR time). These tests exercise the authenticated branch only.
// The anonymous login CTA is an Astro-layer concern tested in e2e/front-page-fabs.spec.ts.

import { profile as profileAtom, uid as uidAtom } from "@pelilauta/auth/client";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import FrontpageFabs from "./FrontpageFabs.svelte";

afterEach(cleanup);

beforeEach(() => {
  uidAtom.set(null);
  profileAtom.set(null);
});

describe("FrontpageFabs", () => {
  it("hides the FAB when uid is null (anonymous)", () => {
    uidAtom.set(null);
    profileAtom.set(null);

    const { container } = render(FrontpageFabs, { props: { label: "New conversation" } });
    const link = container.querySelector('a[href="/create/thread"]');
    expect(link).toBeNull();
  });

  it("hides the FAB when uid is set but profile is null (loading/indeterminate)", async () => {
    uidAtom.set("user-123");
    profileAtom.set(null);

    render(FrontpageFabs, { props: { label: "New conversation" } });

    // Give component time to mount and subscribe
    await waitFor(() => {
      const link = screen.queryByRole("link", { name: /new conversation/i });
      expect(link).toBeNull();
    });
  });

  it("shows the FAB when uid is set and profile has no frozen flag", async () => {
    uidAtom.set("user-123");
    profileAtom.set({ nick: "Alice" });

    render(FrontpageFabs, { props: { label: "New conversation" } });

    await waitFor(() => {
      const link = screen.queryByRole("link", { name: /new conversation/i });
      expect(link).not.toBeNull();
    });
  });

  it("shows the FAB when uid is set and profile.frozen is false", async () => {
    uidAtom.set("user-123");
    profileAtom.set({ nick: "Alice", frozen: false });

    render(FrontpageFabs, { props: { label: "New conversation" } });

    await waitFor(() => {
      const link = screen.queryByRole("link", { name: /new conversation/i });
      expect(link).not.toBeNull();
    });
  });

  it("hides the FAB when profile.frozen is true", async () => {
    uidAtom.set("frozen-user");
    profileAtom.set({ nick: "Frozen", frozen: true });

    render(FrontpageFabs, { props: { label: "New conversation" } });

    await waitFor(() => {
      const link = screen.queryByRole("link", { name: /new conversation/i });
      expect(link).toBeNull();
    });
  });

  it("hides the FAB when uid becomes null after being set (reactive)", async () => {
    uidAtom.set("user-123");
    profileAtom.set({ nick: "Alice" });

    render(FrontpageFabs, { props: { label: "New conversation" } });

    await waitFor(() => {
      const link = screen.queryByRole("link", { name: /new conversation/i });
      expect(link).not.toBeNull();
    });

    uidAtom.set(null);

    await waitFor(() => {
      const link = screen.queryByRole("link", { name: /new conversation/i });
      expect(link).toBeNull();
    });
  });
});
