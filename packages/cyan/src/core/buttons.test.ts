import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "buttons.css"), "utf8");

describe("Buttons Core CSS", () => {
  it("targets raw <button> and a.button", () => {
    expect(css).toMatch(/^button,\s*$/m);
    expect(css).toMatch(/^a\.button\b/m);
  });

  it("defines .cta and .text variants and .secondary ancestor re-tint", () => {
    expect(css).toMatch(/button\.cta/);
    expect(css).toMatch(/button\.text/);
    expect(css).toMatch(/\.secondary\s+button/);
  });

  it("default and CTA surfaces are 137deg linear-gradient(in oklab)", () => {
    expect(css).toMatch(
      /linear-gradient\(\s*in oklab 137deg,\s*var\(--cn-button-light\),\s*var\(--cn-button\)\s*\)/,
    );
    expect(css).toMatch(
      /linear-gradient\(\s*in oklab 137deg,\s*var\(--cn-button-cta\),\s*var\(--cn-button\)\s*\)/,
    );
  });

  it("references only --cn-* tokens (no --cyan-* / --color-*)", () => {
    expect(css).not.toMatch(/--cyan-/);
    expect(css).not.toMatch(/--color-/);
  });

  it("uses overlay composition, not filter: brightness()", () => {
    expect(css).not.toMatch(/filter:\s*brightness/);
    expect(css).toMatch(/button::after/);
    expect(css).toMatch(/a\.button::after/);
  });

  it("derives pill border-radius from --cn-button-size", () => {
    expect(css).toMatch(/border-radius:\s*calc\(var\(--cn-button-size\)\s*\/\s*2\)/);
  });

  it("disabled state sets pointer-events: none", () => {
    expect(css).toMatch(/pointer-events:\s*none/);
  });

  it("icon-only buttons force width to --cn-button-size (circular pill)", () => {
    expect(css).toMatch(/:has\(\.cn-icon:only-child\)/);
    expect(css).toMatch(/:has\(\.cn-loader:only-child\)/);
    expect(css).toMatch(/width:\s*var\(--cn-button-size\)/);
  });
});
