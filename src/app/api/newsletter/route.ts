import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletter } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 3 signups per IP per 10 minutes
    const ip = getClientIp(request);
    const rl = rateLimit(`newsletter:${ip}`, { limit: 3, windowSeconds: 600 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(newsletter)
      .where(eq(newsletter.email, cleanEmail))
      .limit(1);

    if (existing.length > 0) {
      // Don't reveal whether email exists - return success either way
      return NextResponse.json({ message: "Successfully subscribed!" });
    }

    await db.insert(newsletter).values({
      email: cleanEmail,
    });

    return NextResponse.json({ message: "Successfully subscribed!" });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
