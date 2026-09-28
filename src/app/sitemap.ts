import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { posts, categories, authors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { siteConfig } from "@/lib/config";
import { toolCatalog } from "@/lib/tool-catalog";

const LAST_MODIFIED = new Date("2026-06-29T00:00:00.000Z");

export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/$/, "");

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: LAST_MODIFIED, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: LAST_MODIFIED, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/categories`, lastModified: LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/disclaimer`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/site-map`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/tools`, changeFrequency: "weekly", priority: 0.8 },
    ...toolCatalog.map((tool) => ({
      url: `${baseUrl}/tools/${tool.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  if (!db) return staticPages;

  // Dynamic blog posts
  const allPosts = await db
    .select({
      slug: posts.slug,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(eq(posts.published, true));

  const postPages: MetadataRoute.Sitemap = allPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // Category pages
  const allCategories = await db
    .select({ slug: categories.slug })
    .from(categories);

  const categoryPages: MetadataRoute.Sitemap = allCategories.map((cat) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Author pages
  const allAuthors = await db
    .select({ slug: authors.slug })
    .from(authors);

  const authorPages: MetadataRoute.Sitemap = allAuthors.map((author) => ({
    url: `${baseUrl}/author/${author.slug}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...postPages, ...categoryPages, ...authorPages];
}
