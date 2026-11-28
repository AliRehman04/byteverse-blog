import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "./db";
import { categories, posts } from "./db/schema";
import { arrangeHomepagePosts, featuredGuideSlugs, LATEST_GUIDE_COUNT, type HomepagePost } from "./homepage";

const compactPost = {
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
};

function publishedAndDue(now: Date) {
  return and(
    eq(posts.published, true),
    lte(posts.createdAt, now),
    or(isNull(posts.scheduledAt), lte(posts.scheduledAt, now)),
  );
}

// Enough newest posts to fill the latest list even if every curated guide is also among them.
export function createHomepagePostQuery(database: NonNullable<typeof db>, now = new Date()) {
  return database
    .select(compactPost)
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(publishedAndDue(now))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(LATEST_GUIDE_COUNT + featuredGuideSlugs.length);
}

export function createFeaturedGuideQuery(database: NonNullable<typeof db>, now = new Date()) {
  return database
    .select(compactPost)
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(publishedAndDue(now), inArray(posts.slug, featuredGuideSlugs)))
    .limit(featuredGuideSlugs.length);
}

export async function getHomepagePosts(): Promise<{ featured: HomepagePost[]; latest: HomepagePost[] }> {
  if (!db) return { featured: [], latest: [] };
  try {
    const now = new Date();
    const [featured, newest] = await Promise.all([createFeaturedGuideQuery(db, now), createHomepagePostQuery(db, now)]);
    return arrangeHomepagePosts(featured, newest);
  } catch {
    // Let ISR retain its last successful page on a transient database failure.
    // Returning empty lists here would cache a falsely empty article section for six hours.
    throw new Error("Homepage articles could not be loaded.");
  }
}