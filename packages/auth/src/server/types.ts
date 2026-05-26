export type SessionState = "initial" | "loading" | "active" | "error";

export interface SessionProfile {
  nick: string;
  avatarURL?: string;
  frozen?: boolean;
}
