import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const { id } = await params;
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, parseInt(id)));

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json();

  const slug = body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const words = body.content?.split(/\s+/).length || 0;
  const readingTime = `${Math.max(1, Math.ceil(words / 200))} min read`;

  const [post] = await db
    .update(posts)
    .set({
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
      updatedAt: new Date(),
    })
    .where(eq(posts.id, parseInt(id)))
    .returning();

  return NextResponse.json(post);
}
