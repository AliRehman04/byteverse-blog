import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const allPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      categoryId: posts.categoryId,
      categoryName: categories.name,
      author: posts.author,
      published: posts.published,
      featured: posts.featured,
      views: posts.views,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .orderBy(desc(posts.createdAt));

  return NextResponse.json(allPosts);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const body = await request.json();
  const slug = body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Calculate reading time
  const words = body.content?.split(/\s+/).length || 0;
  const readingTime = `${Math.max(1, Math.ceil(words / 200))} min read`;

  const [post] = await db
    .insert(posts)
    .values({
      title: body.title,
      slug,
      excerpt: body.excerpt,
      content: body.content,
      coverImage: body.coverImage || null,
      categoryId: body.categoryId ? parseInt(body.categoryId) : null,
      author: body.author || "Ali Rehman",
      published: body.published ?? false,
      featured: body.featured ?? false,
      metaTitle: body.metaTitle || body.title,
      metaDescription: body.metaDescription || body.excerpt,
      keywords: body.keywords || null,
      readingTime,
    })
    .returning();

  return NextResponse.json(post);
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await db.delete(posts).where(eq(posts.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
