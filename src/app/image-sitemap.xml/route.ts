import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { siteConfig } from "@/lib/config";
import { getImageLicenseUrl, getPostSeoImages } from "@/lib/image-seo";

export const revalidate = 3600;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  if (!db) {
    return new NextResponse("Database not available", { status: 503 });
  }

  const allPosts = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      content: posts.content,
      coverImage: posts.coverImage,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(eq(posts.published, true));

  const urls = allPosts
    .map((post) => {
      const pageUrl = `${siteConfig.url}/blog/${post.slug}`;
      const imageEntries = getPostSeoImages({
        title: post.title,
        coverImage: post.coverImage,
        content: post.content,
      })
        .map((image) => `
    <image:image>
      <image:loc>${escapeXml(image.url)}</image:loc>
      <image:title>${escapeXml(image.alt)}</image:title>
      <image:caption>${escapeXml(image.caption)}</image:caption>
      <image:license>${escapeXml(getImageLicenseUrl(image.url))}</image:license>
    </image:image>`)
        .join("");

      return `
  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>${imageEntries}
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
