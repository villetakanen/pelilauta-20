import { z } from "zod";

export const EntrySchema = z.object({
  key: z.string().default(""),
  flowTime: z.coerce.number().default(0),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  owners: z.array(z.string()).default([]),
});

export type Entry = z.infer<typeof EntrySchema>;

export const ImageArraySchema = z.array(z.object({ url: z.string(), alt: z.string() })).default([]);

export type ImageArray = z.infer<typeof ImageArraySchema>;
