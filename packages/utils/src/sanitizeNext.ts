/**
 * sanitizeNext — validate a `next` redirect target as same-origin relative.
 *
 * Per specs/pelilauta/auth/spec.md §Regression Guardrails:
 * "The next parameter must be validated as same-origin relative (no http://,
 * no //, no protocol-relative). Unsafe values are discarded and / is used
 * instead."
 *
 * Used at two sites:
 *   1. login.astro (primary defense — server-side, before 302 redirect)
 *   2. LoginButton.svelte (defense in depth — client-side, before reload)
 */
export function sanitizeNext(candidate: string | null | undefined): string {
  if (!candidate) return "/";
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return "/";
  return candidate;
}
