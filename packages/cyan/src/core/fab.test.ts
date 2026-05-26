import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fab.css"), "utf8");

describe("FAB Core CSS", () => {
  it("targets button.fab, a.fab, and a.button.fab selectors", () => {
    expect(css).toMatch(/button\.fab/);
    expect(css).toMatch(/a\.fab/);
    expect(css).toMatch(/a\.button\.fab/);
  });

  it("defines .cta, .call-to-action synonym, .secondary, and .small variants", () => {
    expect(css).toMatch(/\.fab\.cta/);
    expect(css).toMatch(/\.fab\.call-to-action/);
    expect(css).toMatch(/\.fab\.secondary/);
    expect(css).toMatch(/\.fab\.small/);
  });

  it("base FAB uses --cn-fab-size for min-width and height", () => {
    expect(css).toMatch(/min-width:\s*var\(--cn-fab-size\)/);
    expect(css).toMatch(/height:\s*var\(--cn-fab-size\)/);
  });

  it("uses --cn-border-radius-large for the circular shape", () => {
    expect(css).toMatch(/border-radius:\s*var\(--cn-border-radius-large\)/);
  });

  it("default surface is linear-gradient(in oklab 137deg ...) with --cn-fab", () => {
    expect(css).toMatch(/linear-gradient\(\s*in oklab 137deg/);
    expect(css).toMatch(/var\(--cn-fab\)/);
  });

  it("uses in oklab (not in lch) for gradient colour space", () => {
    expect(css).not.toMatch(/in lch/);
    expect(css).toMatch(/in oklab/);
  });

  it("CTA variant uses --cn-fab-cta gradient", () => {
    expect(css).toMatch(/var\(--cn-fab-cta\)/);
    expect(css).toMatch(/var\(--cn-fab-cta-blend\)/);
    expect(css).toMatch(/var\(--cn-on-fab-cta\)/);
  });

  it("secondary variant uses --cn-fab-secondary gradient", () => {
    expect(css).toMatch(/\.fab\.secondary[\s\S]*?var\(--cn-fab-secondary\)/);
    expect(css).toMatch(/var\(--cn-fab-secondary-blend\)/);
    expect(css).toMatch(/var\(--cn-on-fab-secondary\)/);
  });

  it("references only --cn-* tokens (no --cyan-* / --color-*)", () => {
    expect(css).not.toMatch(/--cyan-/);
    expect(css).not.toMatch(/--color-/);
  });

  it("enforces flex: 0 0 auto inside .flex > .fab to prevent growing", () => {
    expect(css).toMatch(/flex:\s*0 0 auto/);
    expect(css).toMatch(/\.flex\s*>\s*\.fab/);
  });

  it("hover lifts to --cn-shadow-elevation-4 and active drops to --cn-shadow-elevation-2", () => {
    expect(css).toMatch(/\.fab:hover[\s\S]*?var\(--cn-shadow-elevation-4\)/);
    expect(css).toMatch(/\.fab:active[\s\S]*?var\(--cn-shadow-elevation-2\)/);
  });

  it("anchor FAB suppresses text-decoration", () => {
    expect(css).toMatch(/text-decoration:\s*none/);
  });

  it(".small variant uses --cn-button-size for height and min-width", () => {
    expect(css).toMatch(/\.fab\.small[\s\S]*?min-width:\s*var\(--cn-button-size\)/);
    expect(css).toMatch(/\.fab\.small[\s\S]*?height:\s*var\(--cn-button-size\)/);
  });

  it("icons inside FABs target .cn-icon class (not cn-icon element)", () => {
    expect(css).toMatch(/\.fab\s+\.cn-icon/);
    expect(css).not.toMatch(/\.fab\s+cn-icon\b/);
  });
});
