import { NextResponse } from "next/server";
import { createToken } from "@/lib/auth";
import { timingSafeEqual } from "crypto";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Compare against itself to keep constant time
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Rate limit: 5 login attempts per IP per 15 minutes
  const ip = getClientIp(request);
  const rl = rateLimit(`login:${ip}`, { limit: 5, windowSeconds: 900 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !password || typeof password !== "string" || !safeCompare(password, adminPassword)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createToken();

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours (matches JWT expiry)
    path: "/",
  });

  return response;
}
