import { defineCollection, z } from "astro:content";

const bookSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().optional(),
  status: z.enum(["stable", "alpha", "draft"]).default("stable"),
  /**
   * When true, Book.astro does NOT wrap the MDX slot in a prose <article> cage.
   * The MDX author owns its own content-grid shells. Use for pages that need
   * main-wide layout demos (e.g. Golden / Triad). See specs/cyan-ds/living-style-books/spec.md.
   */
  multipart: z.boolean().optional().default(false),
});

export const collections = {
  principles: defineCollection({ type: "content", schema: bookSchema }),
  styles: defineCollection({ type: "content", schema: bookSchema }),
  components: defineCollection({ type: "content", schema: bookSchema }),
  addons: defineCollection({ type: "content", schema: bookSchema }),
};
