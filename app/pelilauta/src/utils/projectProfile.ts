import type { SessionProfile } from "../stores/session";

/**
 * Synthesizes a minimal SessionProfile from a verified ID-token's custom
 * claims. Narrows `unknown` with `typeof` instead of unsafe casts.
 *
 * Spec: specs/pelilauta/session/spec.md §Data models.
 * Provider-specific coupling: relies on Google OIDC `name` / `picture` fields.
 * Non-Google providers are deferred per specs/pelilauta/auth/spec.md §Out of Scope.
 */
export function projectProfileFromClaims(claims: Record<string, unknown>): SessionProfile {
  const nameRaw = claims.name;
  const pictureRaw = claims.picture;
  return {
    nick: typeof nameRaw === "string" && nameRaw.length > 0 ? nameRaw : "User",
    avatarURL: typeof pictureRaw === "string" && pictureRaw.length > 0 ? pictureRaw : undefined,
  };
}
