import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CnIcon from "./CnIcon.svelte";

describe("CnIcon Resolution Priority (Tiered Contract)", () => {
  it("renders T1 (Community) content for 'fox' noun", () => {
    const { container } = render(CnIcon, { props: { noun: "fox" } });
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // fox is a community icon — must contain shape elements from the SVG file
    expect(svg?.children.length).toBeGreaterThan(0);
  });

  it("prioritizes T1 over T2 for 'mekanismi' (exists in both)", () => {
    const { container } = render(CnIcon, { props: { noun: "mekanismi" } });
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Community mekanismi has fill-opacity attributes (branded depth icon)
    const depthPaths = svg?.querySelectorAll("[fill-opacity]");
    expect(depthPaths.length).toBeGreaterThan(0);
  });

  it("falls back to T3 missing glyph for unknown nouns", () => {
    const { container } = render(CnIcon, { props: { noun: "xyz-nonexistent-1234" } });
    const span = container.querySelector('.cn-icon[data-noun="xyz-nonexistent-1234"]');
    expect(span).not.toBeNull();
    const svg = span?.querySelector("svg");
    expect(svg).not.toBeNull();
    // Missing glyph must render at least one path with currentColor
    const paths = svg?.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0].getAttribute("fill")).toBe("currentColor");
  });

  it("renders T2 (Managed) content for managed-only nouns", () => {
    const { container } = render(CnIcon, { props: { noun: "adventurer" } });
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelector("path")).not.toBeNull();
  });

  it("renders T3 fallback for fallback-only nouns ('menu')", () => {
    const { container } = render(CnIcon, { props: { noun: "menu" } });
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Fallback icons use viewBox 0 0 24 24
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
  });
});

describe("CnIcon Rendering", () => {
  it("sets data-noun attribute on the wrapper span", () => {
    const { container } = render(CnIcon, { props: { noun: "fox" } });
    const span = container.querySelector('.cn-icon[data-noun="fox"]');
    expect(span).not.toBeNull();
  });

  it("sets --icon-dim to medium token by default", () => {
    const { container } = render(CnIcon, { props: { noun: "fox" } });
    const span = container.querySelector(".cn-icon") as HTMLElement;
    expect(span.style.getPropertyValue("--icon-dim")).toBe("var(--cn-icon-size)");
  });

  it("sets --icon-dim to the correct token for each size", () => {
    const expected: Record<string, string> = {
      xsmall: "var(--cn-icon-size-xsmall)",
      small: "var(--cn-icon-size-small)",
      medium: "var(--cn-icon-size)",
      large: "var(--cn-icon-size-large)",
      xlarge: "var(--cn-icon-size-xlarge)",
    };
    for (const [size, token] of Object.entries(expected)) {
      const { container } = render(CnIcon, { props: { noun: "fox", size } });
      const span = container.querySelector(".cn-icon") as HTMLElement;
      expect(span.style.getPropertyValue("--icon-dim")).toBe(token);
    }
  });

  it("sets svg aria-hidden='true'", () => {
    const { container } = render(CnIcon, { props: { noun: "fox" } });
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });
});
