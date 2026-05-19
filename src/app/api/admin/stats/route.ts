import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, categories, newsletter } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({
      totalPosts: 0,
      publishedPosts: 0,
      totalCategories: 0,
      totalViews: 0,
      totalSubscribers: 0,
    });
  }

  const [postStats] = await db
    .select({
      total: sql<number>`count(*)`,
      published: sql<number>`count(*) filter (where ${posts.published} = true)`,
      views: sql<number>`coalesce(sum(${posts.views}), 0)`,
    })
    .from(posts);

  const [catStats] = await db
    .select({ total: sql<number>`count(*)` })
    .from(categories);

  const [subStats] = await db
    .select({ total: sql<number>`count(*)` })
    .from(newsletter)
    .where(eq(newsletter.active, true));

  return NextResponse.json({
    totalPosts: Number(postStats.total),
    publishedPosts: Number(postStats.published),
    totalCategories: Number(catStats.total),
    totalViews: Number(postStats.views),
    totalSubscribers: Number(subStats.total),
  });
}
