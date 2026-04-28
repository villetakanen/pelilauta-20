export function markdownToPlainText(markdown: string, maxLength: number = 220): string {
  if (!markdown.trim()) return "";

  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\n\n+/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;

  const truncated = plain.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cutPoint = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;
  return `${truncated.substring(0, cutPoint)}…`;
}
