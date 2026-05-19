import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await db
      .update(posts)
      .set({ views: sql`${posts.views} + 1` })
      .where(eq(posts.slug, slug));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}
