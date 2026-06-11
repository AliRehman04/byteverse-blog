import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentGaps } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ gaps: [], stats: { total: 0, unresolved: 0, totalQueries: 0 } });
  }

  const gaps = await db
    .select()
    .from(contentGaps)
    .orderBy(desc(contentGaps.count), desc(contentGaps.createdAt))
    .limit(100);

  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      unresolved: sql<number>`count(*) filter (where ${contentGaps.resolved} = false)`,
      totalQueries: sql<number>`coalesce(sum(${contentGaps.count}), 0)`,
    })
    .from(contentGaps);

  return NextResponse.json({ gaps, stats });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "No database" }, { status: 500 });
  }

  const { id, resolved } = await req.json();
  if (!id || typeof resolved !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await db
    .update(contentGaps)
    .set({ resolved, updatedAt: new Date() })
    .where(eq(contentGaps.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "No database" }, { status: 500 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await db.delete(contentGaps).where(eq(contentGaps.id, id));

  return NextResponse.json({ success: true });
}
