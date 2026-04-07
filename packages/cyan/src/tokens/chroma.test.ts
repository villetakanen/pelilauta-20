import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CHROMA_CSS = readFileSync(resolve(__dirname, "chroma.css"), "utf-8");

const SEMANTIC_CSS = readFileSync(resolve(__dirname, "semantic.css"), "utf-8");

/**
 * Parse all `--chroma-{palette}-{step}: oklch(L C H)` declarations from CSS.
 * Returns an array of { palette, step, L, C, H } objects.
 */
function parseChromaTokens(css: string) {
  const re =
    /--chroma-(\w+)-(\d+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+(?:var\([^)]+\)|[\d.]+)\s*\)/g;
  const tokens: {
    palette: string;
    step: number;
    L: number;
    C: number;
  }[] = [];
  for (const m of css.matchAll(re)) {
    tokens.push({
      palette: m[1],
      step: Number(m[2]),
      L: Number(m[3]),
      C: Number(m[4]),
    });
  }
  return tokens;
}

const tokens = parseChromaTokens(CHROMA_CSS);
const primary = tokens.filter((t) => t.palette === "primary");
const surface = tokens.filter((t) => t.palette === "surface");

describe("Chroma Token Regression Guardrails", () => {
  it("parses all expected tokens from chroma.css", () => {
    expect(primary.length).toBe(13);
    expect(surface.length).toBe(13);
  });

  describe("Lightness invariant (L = step / 100)", () => {
    // Primary step 10 is hand-tuned to L=0.12 for legibility separation from step 0
    const TUNED: Record<string, number> = { "primary-10": 0.12 };

    for (const t of tokens) {
      const key = `${t.palette}-${t.step}`;
      const expected = TUNED[key] ?? t.step / 100;
      it(`--chroma-${key} has L=${expected}`, () => {
        expect(t.L).toBeCloseTo(expected, 2);
      });
    }
  });

  describe("Anchor purity (step 0 and 100 have C=0)", () => {
    const anchors = tokens.filter((t) => t.step === 0 || t.step === 100);
    for (const t of anchors) {
      it(`--chroma-${t.palette}-${t.step} has C=0`, () => {
        expect(t.C).toBe(0);
      });
    }
  });

  describe("Primary chroma floor (C > 0.10 for steps 20–95)", () => {
    const midSteps = primary.filter((t) => t.step >= 20 && t.step <= 95);
    for (const t of midSteps) {
      it(`--chroma-primary-${t.step} has C > 0.10 (actual: ${t.C})`, () => {
        expect(t.C).toBeGreaterThan(0.1);
      });
    }
  });

  describe("OKLCH-only color space", () => {
    it("chroma.css contains no hsl() definitions", () => {
      const stripped = CHROMA_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(stripped).not.toMatch(/\bhsl\(/);
    });

    it("chroma.css contains no rgb()/hex definitions", () => {
      const stripped = CHROMA_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(stripped).not.toMatch(/\brgb\(/);
      expect(stripped).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it("semantic.css color-mix calls all use 'in oklch'", () => {
      const mixes = [...SEMANTIC_CSS.matchAll(/color-mix\(in\s+(\w+)/g)];
      expect(mixes.length).toBeGreaterThan(0);
      for (const m of mixes) {
        expect(m[1]).toBe("oklch");
      }
    });
  });
});
