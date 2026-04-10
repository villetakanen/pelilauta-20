import { z } from "zod";
import { EntrySchema } from "./EntrySchema.js";

export const ContentEntrySchema = EntrySchema.extend({
  public: z.boolean().optional(),
  sticky: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  markdownContent: z.string().optional(),
  author: z.string().optional(),
});

export type ContentEntry = z.infer<typeof ContentEntrySchema>;
