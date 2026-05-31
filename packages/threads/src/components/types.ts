// Shared component types for @pelilauta/threads/components.
// Kept in a plain .ts module so they can be re-exported cleanly from the barrel
// without TypeScript's *.svelte type-only export restrictions.

import type { Profile } from "@pelilauta/profiles/server";
import type { Reply } from "../schemas/ReplySchema";

export type ReplyEntry = { reply: Reply; bodyHtml: string; profile: Profile | null };
