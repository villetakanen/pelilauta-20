import { z } from "zod";

export const PROFILES_COLLECTION_NAME = "profiles";

const toFid = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "n-n";

const ProfileLinkSchema = z.object({
  url: z.string().url(),
  label: z.string().min(1).max(50),
});

const normalizeProfile = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") return raw;
  const data = { ...(raw as Record<string, unknown>) };

  if (typeof data.photoURL === "string" && !data.avatarURL) {
    data.avatarURL = data.photoURL;
  }

  const nick = typeof data.nick === "string" && data.nick.trim().length > 0 ? data.nick : "N.N.";
  data.nick = nick;

  if (typeof data.username !== "string" || data.username.trim().length === 0) {
    data.username = toFid(nick);
  }

  if (Array.isArray(data.links)) {
    data.links = data.links
      .map((entry) => ProfileLinkSchema.safeParse(entry))
      .filter(
        (entry): entry is { success: true; data: { url: string; label: string } } => entry.success,
      )
      .map((entry) => entry.data);
  }

  if (Array.isArray(data.tags)) {
    data.tags = data.tags.filter((entry): entry is string => typeof entry === "string");
  }

  if (Array.isArray(data.lovedThreads)) {
    data.lovedThreads = data.lovedThreads.filter(
      (entry): entry is string => typeof entry === "string",
    );
  }

  return data;
};

export const ProfileSchema = z.preprocess(
  normalizeProfile,
  z.object({
    key: z.string(),
    username: z.string(),
    nick: z.string(),
    avatarURL: z.string().optional(),
    bio: z.string().optional(),
    tags: z.array(z.string()).optional(),
    lovedThreads: z.array(z.string()).optional(),
    links: z.array(ProfileLinkSchema).optional(),
  }),
);

export type Profile = z.infer<typeof ProfileSchema>;
