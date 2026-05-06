// Unit tests verify only what jsdom can faithfully observe: rendered DOM
// structure, prop→class mapping, and slot composition. Computed styles
// (backgrounds, margins, border-radius), bounding-rect alignment, and the
// accessibility tree are covered by app/cyan-ds/e2e/components/cn-bubble.spec.ts
// — those scenarios depend on real CSS resolution (light-dark, custom
// properties) and a layout engine, which jsdom does not provide.
//
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Default bubble renders the left-tail variant
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Reply bubble renders the right-tail variant
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Reply prop toggles cleanly
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Slot renders default-slot content

import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import CnBubble from "./CnBubble.svelte";

describe("CnBubble structure", () => {
  it("uses an <article> as its root with the cn-bubble class", () => {
    const { container } = render(CnBubble);
    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.tagName).toBe("ARTICLE");
    expect(root?.classList.contains("cn-bubble")).toBe(true);
  });

  it("does not set a role attribute (the article element supplies it natively)", () => {
    const { container } = render(CnBubble);
    const article = container.querySelector("article.cn-bubble") as HTMLElement;
    expect(article.hasAttribute("role")).toBe(false);
  });

  it("renders default-slot content as a direct child of the article", () => {
    const body = createRawSnippet(() => ({ render: () => "<p>hello bubble</p>" }));
    const { container } = render(CnBubble, { props: { children: body } });
    const article = container.querySelector("article.cn-bubble");
    const paragraph = article?.querySelector("p");
    expect(paragraph?.textContent).toBe("hello bubble");
    expect(paragraph?.parentElement).toBe(article);
  });

  it("renders an empty article when no children are supplied", () => {
    const { container } = render(CnBubble);
    const article = container.querySelector("article.cn-bubble") as HTMLElement;
    expect(article.children.length).toBe(0);
  });
});

describe("CnBubble variant mapping", () => {
  it("omits the reply class when reply is false (default)", () => {
    const { container } = render(CnBubble);
    const article = container.querySelector("article.cn-bubble") as HTMLElement;
    expect(article.classList.contains("reply")).toBe(false);
  });

  it("applies the reply class when reply is true", () => {
    const { container } = render(CnBubble, { props: { reply: true } });
    const article = container.querySelector("article.cn-bubble") as HTMLElement;
    expect(article.classList.contains("reply")).toBe(true);
  });

  it("toggles the reply class as the prop changes", async () => {
    const rendered = render(CnBubble, { props: { reply: false } });
    const article = rendered.container.querySelector("article.cn-bubble") as HTMLElement;
    expect(article.classList.contains("reply")).toBe(false);

    await rendered.rerender({ reply: true });
    expect(article.classList.contains("reply")).toBe(true);

    await rendered.rerender({ reply: false });
    expect(article.classList.contains("reply")).toBe(false);
  });
});
