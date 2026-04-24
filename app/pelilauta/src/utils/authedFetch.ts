import { getAuth } from "@pelilauta/firebase/client";
import { logError } from "@pelilauta/utils/log";
import { logout } from "../stores/session";

export class AuthedFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthedFetchError";
  }
}

/**
 * Single entry point for API writes. Attaches the Firebase ID token as a
 * Bearer header. See `specs/pelilauta/session/spec.md` §Authentication Flow
 * step 4 for the contract.
 *
 * On 401 the request is retried exactly once with a force-refreshed token; a
 * second 401 ends the session. Any path that degrades the session store
 * (null currentUser, getIdToken failure, repeated 401) calls `logout()` +
 * rejects with `AuthedFetchError`. Callers MUST NOT pre-set the
 * Authorization header — it is owned by this function and will be
 * overwritten.
 */
export async function authedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    logError("[authedFetch] called with no currentUser");
    logout();
    throw new AuthedFetchError("User is not signed in.");
  }

  let token: string;
  try {
    token = await user.getIdToken(false);
  } catch (error) {
    logError("[authedFetch] initial getIdToken failed", error);
    logout();
    throw new AuthedFetchError("Failed to get ID token.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  let response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    try {
      token = await user.getIdToken(true);
    } catch (error) {
      logError("[authedFetch] refresh getIdToken failed", error);
      logout();
      throw new AuthedFetchError("Failed to refresh ID token.");
    }

    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set("Authorization", `Bearer ${token}`);

    response = await fetch(input, { ...init, headers: retryHeaders });

    if (response.status === 401) {
      logError("[authedFetch] session expired after refresh retry");
      logout();
      throw new AuthedFetchError("Session expired. Please sign in again.");
    }
  }

  return response;
}
