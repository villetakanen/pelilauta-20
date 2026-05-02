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
  dateLabel: string;
}

function formatDateLabel(time: number, locale: string): string {
  const now = Date.now();
  const diffMs = time - now;
  const diffH = diffMs / (1000 * 60 * 60);
  if (Math.abs(diffH) <= 72) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const diffM = diffMs / (1000 * 60);
    if (Math.abs(diffM) < 60) return rtf.format(Math.round(diffM), "minute");
    if (Math.abs(diffH) < 24) return rtf.format(Math.round(diffH), "hour");
    const diffD = diffH / 24;
    return rtf.format(Math.round(diffD), "day");
  }
  return new Date(time).toISOString().substring(0, 10);
}

export function buildTopThreadCards(
  threads: Thread[],
  channels: Channel[],
  authorProfiles: Array<Profile | null>,
  locale: string,
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
      dateLabel: formatDateLabel(thread.flowTime, locale),
    };
  });
}
