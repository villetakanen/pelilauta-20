// Server-only env helpers for @pelilauta/firebase.
//
// Imports Node-only modules (dotenv, process.env) and MUST NOT be imported
// from client entry points. Splitting this out of `./config.ts` keeps the
// client bundle free of `process` references that would break Svelte island
// hydration in the browser.
//
// See specs/pelilauta/firebase/spec.md §SSR Safety.

import { logError } from "@pelilauta/utils/log";
import { config as loadDotenv } from "dotenv";

// Vite populates import.meta.env from .env files for PUBLIC_ vars, but
// process.env only gets vars from the shell/host. In dev, SECRET_ vars
// live in .env.development — load them into process.env explicitly.
// In production (Netlify), env vars are set on the host and this is a no-op.
loadDotenv({ path: ".env.development" });

// Required SECRET_ env vars for the service account. Read from process.env
// so they are NEVER inlined into client bundles via Vite's import.meta.env.
// SECRET_ is a strict sensitivity classification — any SECRET_ value
// appearing in the published build output fails the Netlify secrets scan.
const SECRET_KEYS = [
  "SECRET_private_key_id",
  "SECRET_private_key",
  "SECRET_client_email",
  "SECRET_client_id",
  "SECRET_client_x509_cert_url",
] as const;

export function buildServiceAccount() {
  const missing = SECRET_KEYS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logError(
      "buildServiceAccount: missing SECRET_ env vars — Firebase Admin will fail to init:",
      missing,
    );
  }

  // Netlify / dotenv store multi-line values with literal \n escapes
  // (two chars: backslash + n). firebase-admin's cert() expects actual
  // newline characters in the PEM; convert before passing.
  const rawKey = process.env.SECRET_private_key;
  const privateKey = rawKey?.replace(/\\n/g, "\n");

  // Diagnostic: safe to log boundary chars (they are the PEM header/footer,
  // not the key material). Helps distinguish env-value shape issues from
  // parse-logic issues. Remove after the first successful auth flow.
  console.log(
    "[buildServiceAccount] private_key diagnostic",
    JSON.stringify({
      rawLength: rawKey?.length,
      cookedLength: privateKey?.length,
      rawHead: rawKey?.slice(0, 32),
      cookedHead: privateKey?.slice(0, 32),
      rawTail: rawKey?.slice(-32),
      cookedTail: privateKey?.slice(-32),
      hasEscapedNewline: rawKey?.includes("\\n"),
      hasRealNewline: rawKey?.includes("\n"),
    }),
  );

  return {
    type: "service_account",
    project_id: import.meta.env.PUBLIC_projectId,
    private_key_id: process.env.SECRET_private_key_id,
    private_key: privateKey,
    client_email: process.env.SECRET_client_email,
    client_id: process.env.SECRET_client_id,
    // auth_uri / token_uri / auth_provider_x509_cert_url are invariant public
    // Google endpoints — PUBLIC_ per v20 correction of v17's mislabeling.
    auth_uri: import.meta.env.PUBLIC_auth_uri,
    token_uri: import.meta.env.PUBLIC_token_uri,
    auth_provider_x509_cert_url: import.meta.env.PUBLIC_auth_provider_x509_cert_url,
    // client_x509_cert_url stays SECRET_ — contains the service-account email
    // (same identifier as client_email, which is also SECRET_).
    client_x509_cert_url: process.env.SECRET_client_x509_cert_url,
    universe_domain: import.meta.env.PUBLIC_universe_domain,
  };
}

export function serverAppOptions() {
  return {
    databaseURL: import.meta.env.PUBLIC_databaseURL,
    storageBucket: import.meta.env.PUBLIC_storageBucket,
  };
}
