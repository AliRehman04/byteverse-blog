import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, eq, lte, isNotNull } from "drizzle-orm";

// Vercel Cron: runs every 12 hours (at 00:00 and 12:00 UTC)
// Configured in vercel.json: { "crons": [{ "path": "/api/cron/publish", "schedule": "0 */12 * * *" }] }

export async function GET(request: Request) {
  // Verify cron secret - fail secure (deny if secret is not configured)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  const now = new Date();

  const scheduled = await db
    .update(posts)
    .set({ published: true, scheduledAt: null, updatedAt: now })
    .where(
      and(
        eq(posts.published, false),
        isNotNull(posts.scheduledAt),
        lte(posts.scheduledAt, now)
      )
    )
    .returning({ id: posts.id, title: posts.title });

  return NextResponse.json({ published: scheduled.length, posts: scheduled });
}
