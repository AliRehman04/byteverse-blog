import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { and, eq, ilike, or, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  if (!db) {
    return NextResponse.json([]);
  }

  const pattern = `%${q}%`;
  const results = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      categoryId: posts.categoryId,
      readingTime: posts.readingTime,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.published, true),
        or(
          ilike(posts.title, pattern),
          ilike(posts.excerpt, pattern),
          ilike(posts.content, pattern),
          ilike(posts.keywords, pattern)
        )
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(20);

  const allCategories = await db.select().from(categories);
  const catMap = new Map(allCategories.map((c) => [c.id, c]));

  const enriched = results.map((p) => ({
    ...p,
    category: p.categoryId ? catMap.get(p.categoryId) ?? null : null,
  }));

  return NextResponse.json(enriched);
}
