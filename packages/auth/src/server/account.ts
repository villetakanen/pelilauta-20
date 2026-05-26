// account.ts — Accessor for the `account/{uid}` Firestore document.
//
// Spec: specs/pelilauta/session/frozen.md §Architecture

import { getDb } from "@pelilauta/firebase/server";
import { logError } from "@pelilauta/utils/log";
import { z } from "zod";

export const AccountSchema = z
  .object({
    frozen: z.boolean().optional().default(false),
  })
  .passthrough();

export type Account = z.infer<typeof AccountSchema>;

/**
 * Reads `account/{uid}` from Firestore and returns the parsed Account.
 * Returns null if the document does not exist or schema parse fails.
 *
 * Spec: specs/pelilauta/session/frozen.md §Server Accessors
 */
export async function getAccount(uid: string): Promise<Account | null> {
  try {
    const snap = await getDb().collection("account").doc(uid).get();

    if (!snap.exists) {
      return null;
    }

    const result = AccountSchema.safeParse(snap.data());
    if (!result.success) {
      logError("[getAccount] schema parse failure", result.error);
      return null;
    }

    return result.data;
  } catch (e) {
    logError("[getAccount] firestore read failed", { uid, error: e });
    return null;
  }
}
