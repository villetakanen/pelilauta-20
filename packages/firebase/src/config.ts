// Centralized env-var mapping for @pelilauta/firebase.
//
// Env var names are inherited verbatim from pelilauta-17 so the same dev/prod
// Firebase projects can be reused across versions without re-provisioning.
// See specs/pelilauta/firebase/spec.md §Environment Variables.
//
// Read lazily via getters — importing this module must not require any env
// var to be set. Missing vars fail loudly when an accessor is actually called.

export const publicConfig = {
  get apiKey() {
    return import.meta.env.PUBLIC_apiKey;
  },
  get authDomain() {
    return import.meta.env.PUBLIC_authDomain;
  },
  get databaseURL() {
    return import.meta.env.PUBLIC_databaseURL;
  },
  get projectId() {
    return import.meta.env.PUBLIC_projectId;
  },
  get storageBucket() {
    return import.meta.env.PUBLIC_storageBucket;
  },
  get messagingSenderId() {
    return import.meta.env.PUBLIC_messagingSenderId;
  },
  get appId() {
    return import.meta.env.PUBLIC_appId;
  },
  get measurementId() {
    return import.meta.env.PUBLIC_measurementId;
  },
} as const;

export function buildServiceAccount() {
  // SECRET_ vars use process.env — they must NEVER be exposed via Vite's
  // import.meta.env / envPrefix, which would inline them into client bundles.
  return {
    type: "service_account",
    project_id: import.meta.env.PUBLIC_projectId,
    private_key_id: process.env.SECRET_private_key_id,
    private_key: process.env.SECRET_private_key,
    client_email: process.env.SECRET_client_email,
    client_id: process.env.SECRET_client_id,
    auth_uri: process.env.SECRET_auth_uri,
    token_uri: process.env.SECRET_token_uri,
    auth_provider_x509_cert_url: process.env.SECRET_auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.SECRET_client_x509_cert_url,
    universe_domain: process.env.SECRET_universe_domain,
  };
}

export function serverAppOptions() {
  return {
    databaseURL: import.meta.env.PUBLIC_databaseURL,
    storageBucket: import.meta.env.PUBLIC_storageBucket,
  };
}
