// Firebase client SDK initialization for browser / Svelte islands.
//
// Init is lazy and memoized — importing this module has no side effects, so
// it is safe to import during SSR even though the underlying SDK is
// browser-oriented. Actual `initializeApp` is deferred to first accessor call.
// See specs/pelilauta/firebase/spec.md §SSR Safety and §Scaffold DoD.

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  getAuth as clientGetAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
} from "firebase/auth";
import { getFirestore as clientGetFirestore, type Firestore } from "firebase/firestore";
import { publicConfig } from "../config";

let _app: FirebaseApp | undefined;

export function getApp(): FirebaseApp {
  if (_app) return _app;
  const existing = getApps().find((a) => a.name === "[DEFAULT]");
  _app = existing ?? initializeApp({ ...publicConfig });
  return _app;
}

export function getDb(): Firestore {
  return clientGetFirestore(getApp());
}

export function getAuth(): Auth {
  return clientGetAuth(getApp());
}

export { GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithRedirect };
