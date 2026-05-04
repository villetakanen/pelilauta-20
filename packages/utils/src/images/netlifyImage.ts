// netlifyImage — Netlify Image CDN URL builder for Firebase Storage URLs.
// See specs/pelilauta/images/spec.md.

import { logWarn } from "../log";

export interface NetlifyImageOptions {
  width?: number;
  height?: number;
  format?: "webp" | "avif" | "auto";
  quality?: number; // 1–100
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  position?: "center" | "top" | "bottom" | "left" | "right";
}

/**
 * Transform a Firebase Storage URL to a Netlify Image CDN URL.
 *
 * In development (`import.meta.env.PROD === false`) the input URL is
 * returned unchanged so local dev does not require the CDN to be reachable.
 *
 * Non-Firebase URLs and malformed URL strings log a warn and pass through.
 */
export function netlifyImage(firebaseUrl: string, options?: NetlifyImageOptions): string {
  let host: string;
  try {
    host = new URL(firebaseUrl).host;
  } catch {
    logWarn("netlifyImage", "Malformed URL:", firebaseUrl);
    return firebaseUrl;
  }

  if (host !== "storage.googleapis.com" && host !== "firebasestorage.googleapis.com") {
    logWarn("netlifyImage", "URL is not from Firebase Storage:", firebaseUrl);
    return firebaseUrl;
  }

  if (import.meta.env.PROD === false) return firebaseUrl;

  const params = new URLSearchParams();
  params.set("url", firebaseUrl);
  if (options?.width && options.width > 0) params.set("w", Math.round(options.width).toString());
  if (options?.height && options.height > 0) params.set("h", Math.round(options.height).toString());
  if (options?.format) params.set("fm", options.format);
  if (options?.quality && options.quality > 0 && options.quality <= 100)
    params.set("q", Math.round(options.quality).toString());
  if (options?.fit) params.set("fit", options.fit);
  if (options?.position) params.set("position", options.position);

  return `/.netlify/images?${params.toString()}`;
}
