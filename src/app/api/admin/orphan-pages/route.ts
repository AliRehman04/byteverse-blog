import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ orphans: [], total: 0 });
  }

  const allPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      views: posts.views,
      content: posts.content,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.published, true));

  // Build a set of all slugs
  const slugSet = new Set(allPosts.map((p) => p.slug));

  // For each post, check how many OTHER posts link to it
  const inboundCounts = new Map<string, number>();
  for (const slug of slugSet) {
    inboundCounts.set(slug, 0);
  }

  for (const post of allPosts) {
    // Find all internal blog links in this post's content
    const linkPattern = /\[([^\]]+)\]\(\/blog\/([a-z0-9-]+)\)/gi;
    let match;
    while ((match = linkPattern.exec(post.content)) !== null) {
      const linkedSlug = match[2];
      if (linkedSlug !== post.slug && inboundCounts.has(linkedSlug)) {
        inboundCounts.set(linkedSlug, (inboundCounts.get(linkedSlug) || 0) + 1);
      }
    }
    // Also check raw href links
    const hrefPattern = /href=["']\/blog\/([a-z0-9-]+)["']/gi;
    while ((match = hrefPattern.exec(post.content)) !== null) {
      const linkedSlug = match[1];
      if (linkedSlug !== post.slug && inboundCounts.has(linkedSlug)) {
        inboundCounts.set(linkedSlug, (inboundCounts.get(linkedSlug) || 0) + 1);
      }
    }
  }

  // Orphans = posts with 0 inbound internal links
  const orphans = allPosts
    .filter((p) => (inboundCounts.get(p.slug) || 0) === 0)
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      views: p.views,
      inboundLinks: 0,
      createdAt: p.createdAt,
    }))
    .sort((a, b) => b.views - a.views);

  return NextResponse.json({
    orphans,
    total: allPosts.length,
    orphanCount: orphans.length,
  });
}
