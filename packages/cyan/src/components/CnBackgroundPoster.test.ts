import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "CnBackgroundPoster.astro"),
  "utf8",
);

describe("CnBackgroundPoster — markup contract", () => {
  it('outer element is <div id="cn-background-poster">', () => {
    expect(source).toMatch(/<div id="cn-background-poster">/);
  });

  it("contains a <picture> element", () => {
    expect(source).toMatch(/<picture>/);
  });

  it("contains conditional responsive <source> with min-width:960px and srcset={md}", () => {
    expect(source).toMatch(/<source media="\(min-width: 960px\)" srcset=\{md\}/);
  });

  it('contains <img> with alt="" and loading="lazy"', () => {
    expect(source).toMatch(/alt=""/);
    expect(source).toMatch(/loading="lazy"/);
  });

  it("has no <script> tag", () => {
    expect(source).not.toMatch(/<script/);
  });

  it("has no client: directive", () => {
    expect(source).not.toMatch(/client:/);
  });
});

describe("CnBackgroundPoster — CSS contract", () => {
  it("targets element by id (#cn-background-poster {)", () => {
    expect(source).toMatch(/#cn-background-poster\s*\{/);
  });

  it("positions absolutely with required layout properties", () => {
    expect(source).toMatch(/position:\s*absolute/);
    expect(source).toMatch(/width:\s*100dvw/);
    expect(source).toMatch(/z-index:\s*-1/);
    expect(source).toMatch(/pointer-events:\s*none/);
  });

  it("bottom gradient stop is var(--cn-surface)", () => {
    expect(source).toMatch(/var\(--cn-surface\)/);
  });

  it("splits the wash into ::before (primary ramp with blend) + ::after (surface fade)", () => {
    expect(source).toMatch(/#cn-background-poster::before/);
    expect(source).toMatch(/#cn-background-poster::after/);
    // ::before uses mix-blend-mode over a chroma-primary ramp.
    expect(source).toMatch(/mix-blend-mode:\s*hard-light/);
    // ::after fades transparent → var(--cn-surface) at the bottom.
    expect(source).toMatch(
      /::after[\s\S]*linear-gradient\([^)]*transparent[^)]*var\(--cn-surface\)/,
    );
  });

  it("color-mix() uses in oklab or in oklch — never in hsl", () => {
    expect(source).toMatch(/color-mix\(\s*in ok(lab|lch)/);
    expect(source).not.toMatch(/color-mix\(\s*in hsl/);
  });

  it("references only --cn-* / --chroma-* tokens — no --color-* or --cyan-*", () => {
    expect(source).not.toMatch(/--color-/);
    expect(source).not.toMatch(/--cyan-/);
  });

  it("dark-mode image has opacity 0.72 with no filter in the default block", () => {
    // The default (non-media) #cn-background-poster img { … } block.
    // Light-mode filter: sepia(…) lives inside @media and is excluded by this match.
    const m = source.match(/#cn-background-poster img\s*\{([^}]*)\}/);
    expect(m).not.toBeNull();
    const defaultImgBlock = m![1];
    expect(defaultImgBlock).toMatch(/opacity:\s*0\.72/);
    expect(defaultImgBlock).not.toMatch(/\bfilter:/);
  });

  it("light-mode branch overrides ::before gradient (distinct from dark default)", () => {
    expect(source).toMatch(/@media\s*\(prefers-color-scheme:\s*light\)/);
    const lightBlock = source.split("@media (prefers-color-scheme: light)")[1];
    expect(lightBlock).toMatch(/#cn-background-poster::before/);
    expect(lightBlock).toMatch(/background:\s*linear-gradient/);
    // Dark default uses hard-light; light branch must use a different blend mode.
    expect(lightBlock).toMatch(/mix-blend-mode:/);
  });

  it("hides below 620px via max-width media query with display: none", () => {
    expect(source).toMatch(/@media\s*\(max-width:\s*620px\)/);
    const narrowBlock = source.split("@media (max-width: 620px)")[1];
    expect(narrowBlock).toMatch(/display:\s*none/);
  });

  it("contains body:has(#cn-background-poster) rule", () => {
    expect(source).toMatch(/body:has\(#cn-background-poster\)/);
  });

  it("does NOT contain dead cyan-4 nav#rail migration debt", () => {
    expect(source).not.toMatch(/nav#rail/);
  });

  it("overrides --cn-app-bar-background on body:has so AppBar goes transparent", () => {
    expect(source).toMatch(/--cn-app-bar-background:\s*transparent/);
    expect(source).toMatch(/--cn-app-bar-background-sticky:\s*transparent/);
  });

  it("applies a semi-transparent surface wash to .cn-drawer on posted pages", () => {
    // The outer .cn-tray wrapper is transparent by default; only the drawer
    // (which actually paints the rail surface on wide screens) needs a rule.
    const m = source.match(/body:has\(#cn-background-poster\)\s+\.cn-drawer\s*\{([^}]*)\}/);
    expect(m).not.toBeNull();
    const block = m![1];
    expect(block).toMatch(/background-color:/);
    expect(block).toMatch(/color-mix\(in oklab/);
    expect(block).toMatch(/var\(--cn-surface\)/);
  });

  it("applies a multi-stop text-shadow halo to chrome over the poster", () => {
    // The halo rule targets .cn-app-bar and .cn-tray via a combined selector.
    const m = source.match(
      /body:has\(#cn-background-poster\)\s*\.cn-app-bar,\s*body:has\(#cn-background-poster\)\s*\.cn-tray\s*\{([^}]*)\}/,
    );
    expect(m).not.toBeNull();
    const block = m![1];
    expect(block).toMatch(/text-shadow:/);
    expect(block).toMatch(/color-mix\(in oklab/);
  });
});
