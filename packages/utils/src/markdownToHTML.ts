// Markdown to HTML rendering — lazy-imported marked + footnote extension. See specs/pelilauta/markdown/spec.md.

export async function markdownToHTML(markdown: string): Promise<string> {
  const { Marked } = await import("marked");
  const markedFootnote = await import("marked-footnote");
  const m = new Marked().use(markedFootnote.default());
  return m.parse(markdown);
}
