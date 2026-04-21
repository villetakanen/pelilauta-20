// Internal module. Public consumers must import from "@pelilauta/firebase/server".
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
