// Client-only barrel for @pelilauta/threads.
//
// Schemas are re-exported from both barrels (spec decision: type/schema
// imports should track the consumer's execution context, not be forced
// through a second import path). Client-specific behaviour (writes,
// listeners, interactive components) lands here in the Writes stage.

export * from "../schemas/ChannelSchema";
export * from "../schemas/ReplySchema";
export * from "../schemas/ThreadSchema";
export type { PostReplyBody } from "./postReply";
export { postReply } from "./postReply";
export {
  appendEntry,
  getStore,
  mergeListenerDiff,
  removeEntry,
  replaceEntry,
  seedEntries,
} from "./replyEntriesStore";
export type { RepliesChangeCallback, ReplyDiff } from "./subscribeReplies";
export { subscribeReplies } from "./subscribeReplies";
