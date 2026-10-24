import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only /admin pages reach this middleware (see matcher): a missing cookie redirects to login.
// Full JWT verification happens in the API routes. Scanner paths fall through to the static 404,
// and API cache headers live in next.config so public traffic costs no function invocation here.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("admin-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
