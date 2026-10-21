import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "./db";
import { categories, posts } from "./db/schema";
import type { HomepagePost } from "./homepage";

export function createHomepagePostQuery(database: NonNullable<typeof db>, now = new Date()) {
  return database
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      readingTime: posts.readingTime,
      author: posts.author,
      createdAt: posts.createdAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(
      eq(posts.published, true),
      lte(posts.createdAt, now),
      or(isNull(posts.scheduledAt), lte(posts.scheduledAt, now)),
    ))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(9);
}

export async function getHomepagePosts(): Promise<HomepagePost[]> {
  if (!db) return [];
  try {
    return await createHomepagePostQuery(db);
  } catch {
    // Let ISR retain its last successful page on a transient database failure.
    // Returning [] here would cache a falsely empty article section for six hours.
    throw new Error("Homepage articles could not be loaded.");
  }
}