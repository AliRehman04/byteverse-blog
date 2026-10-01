import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { siteConfig } from "@/lib/config";
import { resolveBlogSlug } from "@/lib/blog-redirects";

// Evaluate publication state and query parameters for each request. Never reuse
// the former 30-day AMP HTML cache or cache one visitor's query in a redirect.
export const dynamic = "force-dynamic";

function unavailable() {
  // A database outage is temporary, not evidence that an indexed URL is gone.
  return new Response("Service Unavailable", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "300" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!db) return unavailable();
  const targetSlug = resolveBlogSlug(slug);

  let post;
  try {
    [post] = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(and(eq(posts.slug, targetSlug), eq(posts.published, true)))
      .limit(1);
  } catch {
    return unavailable();
  }

  if (!post) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }

  // Use the configured site origin, not a client-supplied Host/forwarded header.
  const destination = new URL(`/blog/${encodeURIComponent(post.slug)}`, siteConfig.url);
  destination.search = request.nextUrl.search;

  return NextResponse.redirect(destination, {
    status: 308,
    headers: { "Cache-Control": "no-store" },
  });
}
