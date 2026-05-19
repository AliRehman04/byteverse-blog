import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("admin-token="))
    ?.split("=")[1];

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
