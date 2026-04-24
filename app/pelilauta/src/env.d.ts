/// <reference types="astro/client" />

declare namespace App {
  type SessionState = "initial" | "loading" | "active" | "error";

  interface Locals {
    uid: string | null;
    claims: Record<string, unknown> | null;
    sessionState: SessionState;
  }
}
