// generateSrcset — builds a responsive srcset string from a Firebase Storage URL.
// See specs/pelilauta/images/spec.md.

import { type NetlifyImageOptions, netlifyImage } from "./netlifyImage";

/**
 * Generate a responsive `srcset` string for multiple widths.
 *
 * Composes `netlifyImage` — all validation, dev pass-through, and Firebase-URL
 * gating are inherited by composition, not duplicated here.
 */
export function generateSrcset(
  firebaseUrl: string,
  widths: number[] = [400, 800, 1600],
  options: Omit<NetlifyImageOptions, "width"> = {},
): string {
  return widths
    .map((width) => `${netlifyImage(firebaseUrl, { ...options, width })} ${width}w`)
    .join(", ");
}
