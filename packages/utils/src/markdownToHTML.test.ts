// Markdown rendering tests — specs/pelilauta/markdown/spec.md

import { describe, expect, it } from "vitest";
import { markdownToHTML } from "./markdownToHTML";

describe("markdownToHTML", () => {
  it("renders basic markdown emphasis", async () => {
    const result = await markdownToHTML("**bold**");
    expect(result).toContain("<strong>bold</strong>");
  });

  it("renders a heading", async () => {
    const result = await markdownToHTML("# Title");
    expect(result).toContain("<h1");
    expect(result).toContain(">Title</h1>");
  });

  it("renders a link", async () => {
    const result = await markdownToHTML("[Pelilauta](https://pelilauta.fi)");
    expect(result).toContain('href="https://pelilauta.fi"');
    expect(result).toContain(">Pelilauta</a>");
  });

  it("renders a fenced code block", async () => {
    const result = await markdownToHTML("```ts\nconst x = 1;\n```");
    expect(result).toContain("<pre>");
    expect(result).toContain("<code");
    expect(result).toContain("const x = 1;");
  });

  it("renders footnote syntax", async () => {
    const result = await markdownToHTML("See note[^1]\n\n[^1]: a footnote");
    expect(result).toContain('href="#');
    expect(result).toContain("a footnote");
  });

  it("empty input does not throw", async () => {
    const result = await markdownToHTML("");
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it("whitespace-only input does not throw", async () => {
    await expect(markdownToHTML("   \n\n  ")).resolves.toBeDefined();
  });

  it("fresh instance per call — consecutive calls return consistent output", async () => {
    const input = "**hello**";
    const first = await markdownToHTML(input);
    const second = await markdownToHTML(input);
    expect(first).toBe(second);
  });
});
