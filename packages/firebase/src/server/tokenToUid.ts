import { getAuth as adminGetAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getApp } from "./app";

export async function verifyIdToken(idToken: string, checkRevoked = true): Promise<DecodedIdToken> {
  return adminGetAuth(getApp()).verifyIdToken(idToken, checkRevoked);
}
