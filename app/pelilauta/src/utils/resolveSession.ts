import { extractCustomClaims, verifySessionCookie } from "@pelilauta/firebase/server";

export type SessionResolution = {
  uid: string | null;
  claims: Record<string, unknown> | null;
};

function anonymous(): SessionResolution {
  return { uid: null, claims: null };
}

/**
 * Centralized session-cookie verification + claims projection + log-before-degrade
 * policy. Every callsite that resolves SSR identity from the `session` cookie
 * (middleware, `/api/auth/session` GET, `/api/auth/status`) MUST use this helper
 * so the three sites cannot drift. See `specs/pelilauta/session/spec.md`
 * §Anti-Patterns → "Divergent cookie verification".
 *
 * `logPrefix` should identify the callsite (e.g. "middleware", "api/auth/status")
 * so infra errors can be traced back to the entry point.
 */
export async function resolveSessionFromCookie(
  cookieValue: string | undefined,
  logPrefix: string,
): Promise<SessionResolution> {
  if (!cookieValue) return anonymous();

  try {
    const decoded = await verifySessionCookie(cookieValue, true);
    return { uid: decoded.uid, claims: extractCustomClaims(decoded) };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (!code?.startsWith("auth/")) {
      console.error(`[${logPrefix}] Unexpected session verification failure`, error);
    }
    return anonymous();
  }
}
