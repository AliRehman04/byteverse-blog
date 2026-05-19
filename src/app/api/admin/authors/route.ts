import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authors } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }
  const allAuthors = await db.select().from(authors).orderBy(authors.name);
  return NextResponse.json(allAuthors);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = body.slug || body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const [author] = await db
    .insert(authors)
    .values({
      name: body.name,
      slug,
      role: body.role || "Author",
      bio: body.bio || null,
      email: body.email || null,
      avatar: body.avatar || null,
      twitter: body.twitter || null,
      linkedin: body.linkedin || null,
      github: body.github || null,
      youtube: body.youtube || null,
    })
    .returning();

  return NextResponse.json(author);
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const body = await request.json();

  if (!body.id || !body.name) {
    return NextResponse.json({ error: "ID and name are required" }, { status: 400 });
  }

  const slug = body.slug || body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const [updated] = await db
    .update(authors)
    .set({
      name: body.name,
      slug,
      role: body.role || "Author",
      bio: body.bio || null,
      email: body.email || null,
      avatar: body.avatar || null,
      twitter: body.twitter || null,
      linkedin: body.linkedin || null,
      github: body.github || null,
      youtube: body.youtube || null,
    })
    .where(eq(authors.id, body.id))
    .returning();

  return NextResponse.json(updated);
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
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await db.delete(authors).where(eq(authors.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
