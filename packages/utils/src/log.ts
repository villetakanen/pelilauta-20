// Structured logging — thin wrappers over console.* with level gating.
//
// Production default: only logError produces output. logWarn and logDebug
// are silent unless PUBLIC_LOG_VERBOSE === 'true' in the environment.
// See specs/pelilauta/logging/spec.md.

import { z } from "zod";

const isVerbose = () => import.meta.env.PUBLIC_LOG_VERBOSE === "true";

export function logError(...args: unknown[]): void {
  for (const arg of args) {
    if (arg instanceof z.ZodError) {
      logError(arg.issues);
      return;
    }
    if (arg && typeof arg === "object" && "code" in arg && "message" in arg) {
      console.error("🔥", (arg as { code: string }).code, (arg as { message: string }).message);
      return;
    }
  }
  console.error("🦑", ...args);
}

export function logWarn(...args: unknown[]): void {
  if (!isVerbose()) return;
  console.warn("⚠️", ...args);
}

export function logDebug(...args: unknown[]): void {
  if (!isVerbose()) return;
  console.debug("🐛", ...args);
}
