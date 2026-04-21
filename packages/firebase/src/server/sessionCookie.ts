import { getAuth as adminGetAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getApp } from "./app";

export interface SessionCookieOptions {
  expiresIn: number;
}

export async function createSessionCookie(
  idToken: string,
  options: SessionCookieOptions,
): Promise<string> {
  return adminGetAuth(getApp()).createSessionCookie(idToken, options);
}

export async function verifySessionCookie(
  cookie: string,
  checkRevoked = true,
): Promise<DecodedIdToken> {
  return adminGetAuth(getApp()).verifySessionCookie(cookie, checkRevoked);
}
