// Unit tests verify only what jsdom can faithfully observe: rendered DOM
// structure, class toggles based on `fixed` prop, and slot composition.
// Layout assertions (position: sticky/fixed, top/bottom values, breakpoint
// switching) require a real CSS layout engine and are covered by the e2e spec
// at app/cyan-ds/e2e/components/cn-reply-anchor.spec.ts.
//
// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Desktop layout is bottom-sticky
// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Mobile layout is top-fixed
// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Inline layout does not stick

import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import CnReplyAnchor from "./CnReplyAnchor.svelte";

describe("CnReplyAnchor structure", () => {
  it("renders an <aside> root element", () => {
    const { container } = render(CnReplyAnchor);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("ASIDE");
  });

  it("root has the cn-reply-anchor class", () => {
    const { container } = render(CnReplyAnchor);
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains("cn-reply-anchor")).toBe(true);
  });
});

// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Desktop layout is bottom-sticky
// Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Mobile layout is top-fixed
describe("CnReplyAnchor fixed prop", () => {
  it("adds cn-reply-anchor--fixed class when fixed=true (default)", () => {
    const { container } = render(CnReplyAnchor);
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains("cn-reply-anchor--fixed")).toBe(true);
  });

  it("adds cn-reply-anchor--fixed class when fixed=true explicitly", () => {
    const { container } = render(CnReplyAnchor, { props: { fixed: true } });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains("cn-reply-anchor--fixed")).toBe(true);
  });

  // Verifies: specs/cyan-ds/components/cn-reply-anchor/spec.md §Inline layout does not stick
  it("does not add cn-reply-anchor--fixed class when fixed=false", () => {
    const { container } = render(CnReplyAnchor, { props: { fixed: false } });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains("cn-reply-anchor--fixed")).toBe(false);
  });
});

describe("CnReplyAnchor slot composition", () => {
  it("renders the default slot inside .cn-reply-anchor__bar", () => {
    const childSnippet = createRawSnippet(() => ({
      render: () => '<textarea placeholder="Write a reply…"></textarea>',
    }));
    const { container } = render(CnReplyAnchor, {
      props: { children: childSnippet },
    });
    const bar = container.querySelector(".cn-reply-anchor__bar");
    expect(bar).not.toBeNull();
    expect(bar?.querySelector("textarea")).not.toBeNull();
  });

  it("renders the overhead slot inside .cn-reply-anchor__overhead", () => {
    const overheadSnippet = createRawSnippet(() => ({
      render: () => '<div class="reply-context">Replying to @tapa</div>',
    }));
    const { container } = render(CnReplyAnchor, {
      props: { overhead: overheadSnippet },
    });
    const overhead = container.querySelector(".cn-reply-anchor__overhead");
    expect(overhead).not.toBeNull();
    expect(overhead?.querySelector(".reply-context")).not.toBeNull();
  });

  it("omits .cn-reply-anchor__overhead when no overhead snippet is provided", () => {
    const { container } = render(CnReplyAnchor);
    expect(container.querySelector(".cn-reply-anchor__overhead")).toBeNull();
  });

  it("omits .cn-reply-anchor__bar when no children snippet is provided", () => {
    const { container } = render(CnReplyAnchor);
    expect(container.querySelector(".cn-reply-anchor__bar")).toBeNull();
  });

  it("renders both overhead and bar when both snippets are provided", () => {
    const childSnippet = createRawSnippet(() => ({
      render: () => "<textarea></textarea>",
    }));
    const overheadSnippet = createRawSnippet(() => ({
      render: () => "<span>context</span>",
    }));
    const { container } = render(CnReplyAnchor, {
      props: { children: childSnippet, overhead: overheadSnippet },
    });
    expect(container.querySelector(".cn-reply-anchor__bar")).not.toBeNull();
    expect(container.querySelector(".cn-reply-anchor__overhead")).not.toBeNull();
  });
});

// NOTE: Position (sticky/fixed), bottom/top values, and breakpoint behavior
// cannot be verified in jsdom because jsdom does not implement CSS layout.
// Those scenarios are covered by app/cyan-ds/e2e/components/cn-reply-anchor.spec.ts.
