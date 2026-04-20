import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "dividers.css"), "utf8");

describe("Dividers Core CSS", () => {
  it("targets raw <hr> globally", () => {
    expect(css).toMatch(/^hr\s*\{/m);
  });

  it("references only --cn-* tokens", () => {
    expect(css).not.toMatch(/--cyan-/);
    expect(css).not.toMatch(/--color-/);
    expect(css).toMatch(/var\(--cn-border\)/);
    expect(css).toMatch(/var\(--cn-line\)/);
  });

  it("paints the line via background-color, not border-top", () => {
    expect(css).toMatch(/background-color:\s*var\(--cn-border\)/);
    expect(css).toMatch(/border:\s*none/);
    expect(css).not.toMatch(/border-top:/);
    expect(css).not.toMatch(/border-bottom:/);
  });

  it("declares 1px height so the background paints a 1-line rule", () => {
    expect(css).toMatch(/height:\s*1px/);
  });

  it("uses --cn-line for vertical margin (grid-aligned rhythm)", () => {
    expect(css).toMatch(/margin:\s*var\(--cn-line\)\s+0/);
  });

  it("does not hardcode colours or pixel margins", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(css).not.toMatch(/rgb\(/);
    expect(css).not.toMatch(/oklch\(/);
    // Only the 1px height is allowed as a pixel literal; other pixel
    // values would indicate a hardcoded margin or offset.
    const pxMatches = css.match(/\d+px/g) ?? [];
    expect(pxMatches).toEqual(["1px"]);
  });
});
