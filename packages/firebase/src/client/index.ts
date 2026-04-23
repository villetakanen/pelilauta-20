// Firebase client SDK initialization for browser / Svelte islands.
//
// Init is lazy and memoized — importing this module has no side effects, so
// it is safe to import during SSR even though the underlying SDK is
// browser-oriented. Actual `initializeApp` + DOM-touching persistence setup
// are deferred to first accessor call.
// See specs/pelilauta/firebase/spec.md §SSR Safety and §Scaffold DoD.

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  browserLocalPersistence,
  getAuth as clientGetAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
} from "firebase/auth";
import { getFirestore as clientGetFirestore, type Firestore } from "firebase/firestore";
import { publicConfig } from "../config";

let _app: FirebaseApp | undefined;
let _persistenceApplied = false;

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
  const auth = clientGetAuth(getApp());
  applyLocalhostPersistence(auth);
  return auth;
}

// Force localStorage persistence on localhost so Playwright can capture auth
// state (IndexedDB isn't easily accessible from Playwright). Deferred to
// first getAuth() call so the module remains SSR-safe at import time.
function applyLocalhostPersistence(auth: Auth): void {
  if (_persistenceApplied) return;
  if (typeof window === "undefined") return;
  if (window.location.hostname !== "localhost") return;
  _persistenceApplied = true;
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Failed to set auth persistence:", error);
  });
}

export { GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithRedirect };
