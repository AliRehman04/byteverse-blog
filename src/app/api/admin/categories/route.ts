import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }
  const allCategories = await db.select().from(categories).orderBy(categories.name);
  return NextResponse.json(allCategories);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const body = await request.json();
  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const [category] = await db
    .insert(categories)
    .values({
      name: body.name,
      slug,
      description: body.description || null,
      color: body.color || "#6366f1",
    })
    .returning();

  return NextResponse.json(category);
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const body = await request.json();
  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const [category] = await db
    .update(categories)
    .set({
      name: body.name,
      slug,
      description: body.description || null,
      color: body.color || "#6366f1",
    })
    .where(eq(categories.id, body.id))
    .returning();

  return NextResponse.json(category);
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

  await db.delete(categories).where(eq(categories.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
