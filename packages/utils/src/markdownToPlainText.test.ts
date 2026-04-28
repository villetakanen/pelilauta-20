import { describe, expect, it } from "vitest";
import { markdownToPlainText } from "./markdownToPlainText.js";

describe("markdownToPlainText", () => {
  it("empty string returns empty string", () => {
    expect(markdownToPlainText("")).toBe("");
  });

  it("whitespace-only string returns empty string", () => {
    expect(markdownToPlainText("   \n\n  ")).toBe("");
  });

  it("ATX headers are stripped", () => {
    expect(markdownToPlainText("# Header 1\n## Header 2")).toBe("Header 1 Header 2");
  });

  it("links collapse to their visible text", () => {
    expect(markdownToPlainText("[Example](https://example.com)")).toBe("Example");
  });

  it("images collapse to alt text without leaving a stray !", () => {
    const result = markdownToPlainText("![Alt text](image.png)");
    expect(result).toBe("Alt text");
    expect(result).not.toContain("!");
  });

  it("bold and italic markers are removed without losing inner text", () => {
    expect(markdownToPlainText("This is **bold** and *italic* text")).toBe(
      "This is bold and italic text",
    );
  });

  it("fenced code blocks are removed entirely", () => {
    expect(markdownToPlainText("```javascript\nconst x = 1;\n```")).toBe("");
  });

  it("inline code keeps its content", () => {
    expect(markdownToPlainText("Use `console.log()` for debugging")).toBe(
      "Use console.log() for debugging",
    );
  });

  it("unordered list markers are stripped", () => {
    expect(markdownToPlainText("- Item 1\n- Item 2\n+ Item 3")).toBe("Item 1 Item 2 Item 3");
  });

  it("ordered list markers are stripped", () => {
    expect(markdownToPlainText("1. First\n2. Second\n3. Third")).toBe("First Second Third");
  });

  it("blockquote markers are stripped", () => {
    expect(markdownToPlainText("> This is a quote")).toBe("This is a quote");
  });

  it("raw HTML tags are stripped", () => {
    const result = markdownToPlainText("This is <strong>bold</strong>");
    expect(result).toBe("This is bold");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("whitespace is normalized to single spaces", () => {
    expect(markdownToPlainText("Text\n\nWith\n\n\nMultiple\n\n\n\nNewlines")).toBe(
      "Text With Multiple Newlines",
    );
  });

  it("default maxLength is 220 with Unicode ellipsis appended on truncation", () => {
    const input = "A".repeat(300);
    const result = markdownToPlainText(input);
    expect(result.length).toBe(221);
    expect(result.endsWith("…")).toBe(true);
  });

  it("truncation cuts at the last space when within 80% window", () => {
    const result = markdownToPlainText("The quick brown fox jumps over the lazy dog", 20);
    expect(result).toBe("The quick brown fox…");
    expect(result.length).toBe(20);
  });

  it("truncation hard-cuts when no good word boundary exists", () => {
    const result = markdownToPlainText("Supercalifragilisticexpialidocious", 20);
    expect(result.length).toBe(21);
    expect(result.endsWith("…")).toBe(true);
  });

  it("shorter-than-limit input does not gain an ellipsis", () => {
    const result = markdownToPlainText("Short text", 100);
    expect(result).toBe("Short text");
    expect(result).not.toContain("…");
  });

  it("complex multi-block markdown collapses to a clean prose snippet", () => {
    const input = `# Welcome

This is **bold** and *italic* with [a link](https://example.com).

- List item
- Another item

> A quote`;
    expect(markdownToPlainText(input)).toBe(
      "Welcome This is bold and italic with a link. List item Another item A quote",
    );
  });
});
