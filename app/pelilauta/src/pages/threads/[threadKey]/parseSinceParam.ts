// parseSinceParam — parse the ?since= query param into a numeric flowTime.
//
// Returns the numeric value when the param is a finite integer string,
// undefined when the param is missing, empty, or not a valid number.
// No error is surfaced to the user on invalid input — callers receive
// undefined and skip the scroll-to-target behavior.
//
// Verifies: specs/pelilauta/threads/detail-page/replies/spec.md §?since={flowTime} scrolls to the first matching reply

export function parseSinceParam(url: URL | string | null | undefined): number | undefined {
  if (!url) return undefined;

  let params: URLSearchParams;
  try {
    params = typeof url === "string" ? new URL(url).searchParams : url.searchParams;
  } catch {
    return undefined;
  }

  const raw = params.get("since");
  if (!raw) return undefined;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;

  return parsed;
}
