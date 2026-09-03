import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reactions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const VALID_TYPES = ["like", "love", "clap", "fire", "think"] as const;

/** GET /api/reactions?slug=my-post — get all reaction counts (CDN-cached to protect DB quota) */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug || !db) {
    return NextResponse.json({ reactions: {} });
  }

  const rows = await db
    .select({ type: reactions.type, count: reactions.count })
    .from(reactions)
    .where(eq(reactions.postSlug, slug));

  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.type] = r.count;
  }

  // Cache at the CDN so repeat pageviews don't wake the database.
  return NextResponse.json(
    { reactions: result },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}

/** POST /api/reactions — increment a reaction */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`reactions:${ip}`, { limit: 15, windowSeconds: 60 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { slug, type } = await req.json();

    if (!slug || typeof slug !== "string" || slug.length > 200 || !/^[a-z0-9-]+$/.test(slug) || !type || !VALID_TYPES.includes(type) || !db) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Upsert: insert or increment
    await db
      .insert(reactions)
      .values({ postSlug: slug, type, count: 1 })
      .onConflictDoUpdate({
        target: [reactions.postSlug, reactions.type],
        set: { count: sql`${reactions.count} + 1` },
      })
      .catch(async () => {
        // Fallback if unique index doesn't exist yet — try update first
        const existing = await db!
          .select()
          .from(reactions)
          .where(and(eq(reactions.postSlug, slug), eq(reactions.type, type)))
          .limit(1);

        if (existing.length > 0) {
          await db!
            .update(reactions)
            .set({ count: sql`${reactions.count} + 1` })
            .where(and(eq(reactions.postSlug, slug), eq(reactions.type, type)));
        } else {
          await db!.insert(reactions).values({ postSlug: slug, type, count: 1 });
        }
      });

    // Return updated counts
    const rows = await db
      .select({ type: reactions.type, count: reactions.count })
      .from(reactions)
      .where(eq(reactions.postSlug, slug));

    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r.type] = r.count;
    }

    return NextResponse.json({ reactions: result });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
