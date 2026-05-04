// CategoryRefSchema — embedded category-list array shape, ported verbatim from
// .tmp/pelilauta-17/src/schemas/SiteSchema.ts (CategoryRefSchema).
//
// BREAKING CHANGE: This replaces earlier (< 16.x.y) category metadata that
// was stored in firestore db as "Categories" array in the site document.

import { z } from "zod";

export const CategoryRefSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export type CategoryRef = z.infer<typeof CategoryRefSchema>;

export function parseCategories(data: Partial<CategoryRef[]>): CategoryRef[] {
  return data.map((category) => {
    return CategoryRefSchema.parse(category);
  });
}
