import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block common attack paths / scanners
  const blockedPaths = [
    "/wp-admin", "/wp-login", "/wp-content", "/wp-includes",
    "/xmlrpc.php", "/.env", "/.git", "/phpmyadmin",
    "/administrator", "/admin.php", "/cgi-bin",
    "/.well-known/security.txt",
  ];

  const lowerPath = pathname.toLowerCase();
  if (blockedPaths.some((p) => lowerPath.startsWith(p))) {
    return new NextResponse(null, { status: 404 });
  }

  // Block requests with suspicious query parameters
  const url = request.url;
  if (
    url.includes("<script") ||
    url.includes("javascript:") ||
    url.includes("onclick=") ||
    url.includes("onerror=")
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Admin routes - verify admin-token cookie exists at edge
  // (Full JWT verification happens in the API routes)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("admin-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Add security headers to API responses
  const response = NextResponse.next();

  // Prevent caching of API responses with sensitive data
  if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/auth")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)).*)",
  ],
};
