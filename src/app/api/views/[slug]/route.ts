import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // Rate limit: 10 view tracks per IP per minute (prevents artificial inflation)
    const ip = getClientIp(request);
    const rl = rateLimit(`views:${ip}`, { limit: 10, windowSeconds: 60 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { slug } = await params;

    // Validate slug format
    if (!slug || slug.length > 200 || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

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
