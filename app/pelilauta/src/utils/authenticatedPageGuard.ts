/**
 * Shared redirect gate for pages that require an authenticated SSR identity.
 *
 * Spec: `specs/pelilauta/auth/spec.md` §Architecture → `pages/settings.astro`.
 * Pure function so the gate can be unit-tested without spinning up the Astro
 * SSR pipeline; pages import it in frontmatter and forward `Astro.redirect`.
 */
export interface AuthRedirect {
  path: string;
  status: 302;
}

export function redirectIfAnonymous(
  uid: string | null | undefined,
  selfPath: string,
): AuthRedirect | null {
  if (uid) return null;
  return { path: `/login?next=${selfPath}`, status: 302 };
}
