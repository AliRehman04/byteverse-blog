import { and, count, desc, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "./db";
import { categories, posts } from "./db/schema";
import { BLOG_PAGE_SIZE, emptyBlogIndex, type BlogIndex } from "./blog";

// Same publication rule as the homepage: published, not future-dated, not scheduled ahead.
function publishedFilter(now: Date) {
  return and(eq(posts.published, true), lte(posts.createdAt, now), or(isNull(posts.scheduledAt), lte(posts.scheduledAt, now)));
}

export function createBlogIndexQueries(database: NonNullable<typeof db>, page: number, now = new Date()) {
  const published = publishedFilter(now);
  const list = database
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
    .where(published)
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(BLOG_PAGE_SIZE)
    .offset((page - 1) * BLOG_PAGE_SIZE);
  const total = database.select({ total: count() }).from(posts).where(published);
  const popular = database
    .select({ id: posts.id, title: posts.title, slug: posts.slug, readingTime: posts.readingTime, createdAt: posts.createdAt })
    .from(posts)
    .where(published)
    .orderBy(desc(posts.views), desc(posts.createdAt), desc(posts.id))
    .limit(5);
  const categoryCounts = database
    .select({ id: categories.id, name: categories.name, slug: categories.slug, color: categories.color, count: count(posts.id) })
    .from(categories)
    .leftJoin(posts, and(eq(posts.categoryId, categories.id), published))
    .groupBy(categories.id)
    .orderBy(desc(count(posts.id)), categories.name);
  return { list, total, popular, categoryCounts };
}

export async function getBlogIndex(page: number): Promise<BlogIndex> {
  if (!db) return emptyBlogIndex(page);
  const queries = createBlogIndexQueries(db, page);
  try {
    const [list, [totalRow], popular, categoryCounts] = await Promise.all([queries.list, queries.total, queries.popular, queries.categoryCounts]);
    const total = totalRow?.total ?? 0;
    return { posts: list, popular, categories: categoryCounts, total, page, totalPages: Math.ceil(total / BLOG_PAGE_SIZE) };
  } catch {
    // Keep the last good ISR page instead of caching an empty archive on a transient failure.
    throw new Error("Blog articles could not be loaded.");
  }
}
