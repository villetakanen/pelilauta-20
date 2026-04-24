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

  return {
    type: "service_account",
    project_id: import.meta.env.PUBLIC_projectId,
    private_key_id: process.env.SECRET_private_key_id,
    // Netlify / dotenv store multi-line values with literal \n escapes
    // (two chars: backslash + n). firebase-admin's cert() expects actual
    // newline characters in the PEM; convert before passing.
    private_key: process.env.SECRET_private_key?.replace(/\\n/g, "\n"),
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
