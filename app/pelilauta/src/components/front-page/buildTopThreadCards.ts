// Pure data-prep for TopThreadsStream — see specs/pelilauta/front-page/top-threads-stream/spec.md.

import type { TFn } from "@pelilauta/i18n";
import type { Profile } from "@pelilauta/profiles/server";
import type { Channel, Thread } from "@pelilauta/threads/server";
import { markdownToPlainText } from "@pelilauta/utils/markdownToPlainText";

export interface ThreadCardData {
  thread: Thread;
  snippet: string;
  coverUrl?: string;
  channelSlug: string;
  channelLinkLabel: string;
  channelIcon?: string;
  authorProfile: Profile | null;
}

export function buildTopThreadCards(
  threads: Thread[],
  channels: Channel[],
  authorProfiles: Array<Profile | null>,
  t: TFn,
): ThreadCardData[] {
  return threads.map((thread, i) => {
    const channel = channels.find((c) => c.slug === thread.channel);
    const topic = channel?.name ?? thread.channel;
    return {
      thread,
      snippet: markdownToPlainText(thread.markdownContent || "", 220),
      coverUrl: thread.poster ?? thread.images?.[0]?.url,
      channelSlug: thread.channel,
      channelLinkLabel: t("threads:thread.inChannel", { topic }),
      channelIcon: channel?.icon,
      authorProfile: authorProfiles[i] ?? null,
    };
  });
}
