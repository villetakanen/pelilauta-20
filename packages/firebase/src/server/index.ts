// Firebase Admin SDK initialization for SSR / API routes.
//
// Service-account credentials come from SECRET_* env vars; project-level
// config from PUBLIC_*. Init is lazy and memoized: importing this module has
// no side effects, env vars are only read on the first accessor call.
// See specs/pelilauta/firebase/spec.md §SSR Safety and §Scaffold DoD.

import type { App } from "firebase-admin/app";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { type Auth, getAuth as adminGetAuth } from "firebase-admin/auth";
import { getFirestore as adminGetFirestore, type Firestore } from "firebase-admin/firestore";
import { buildServiceAccount, serverAppOptions } from "../config";

let _app: App | undefined;

export function getApp(): App {
  if (_app) return _app;
  const existing = getApps().find((a) => a?.name === "[DEFAULT]");
  _app =
    existing ??
    initializeApp({
      credential: cert(buildServiceAccount() as ServiceAccount),
      ...serverAppOptions(),
    });
  return _app;
}

export function getDb(): Firestore {
  return adminGetFirestore(getApp());
}

export function getAuth(): Auth {
  return adminGetAuth(getApp());
}
