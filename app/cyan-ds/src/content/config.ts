import { defineCollection, z } from "astro:content";

const bookSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().optional(),
  status: z.enum(["stable", "alpha", "draft"]).default("stable"),
});

export const collections = {
  principles: defineCollection({ type: "content", schema: bookSchema }),
  styles: defineCollection({ type: "content", schema: bookSchema }),
  components: defineCollection({ type: "content", schema: bookSchema }),
  addons: defineCollection({ type: "content", schema: bookSchema }),
};
