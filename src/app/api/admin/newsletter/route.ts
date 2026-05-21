import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletter } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const subscribers = await db
      .select()
      .from(newsletter)
      .orderBy(desc(newsletter.subscribedAt));

    const totalActive = subscribers.filter((s) => s.active).length;

    return NextResponse.json({ subscribers, totalActive, total: subscribers.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}

// DELETE subscriber
export async function DELETE(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await db.delete(newsletter).where(eq(newsletter.id, id));
    return NextResponse.json({ message: "Subscriber deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete subscriber" }, { status: 500 });
  }
}

// PATCH — toggle active status
export async function PATCH(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { id, active } = await request.json();
    if (!id || typeof active !== "boolean") {
      return NextResponse.json({ error: "ID and active status required" }, { status: 400 });
    }

    await db
      .update(newsletter)
      .set({ active })
      .where(eq(newsletter.id, id));

    return NextResponse.json({ message: "Subscriber updated" });
  } catch {
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }
}
