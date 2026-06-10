import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { posts, categories, authors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { siteConfig } from "@/lib/config";

const LAST_MODIFIED = new Date("2026-06-06T00:00:00.000Z");

export const revalidate = 3600;

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
    { url: `${baseUrl}/site-map`, lastModified: LAST_MODIFIED, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/tools`, lastModified: LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/tools/json-formatter`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/password-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/meta-tag-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/base64-encoder-decoder`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/word-counter`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/llms-txt-generator-validator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/regex-tester`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/jwt-decoder`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/hash-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/uuid-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/timestamp-converter`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/url-encoder-decoder`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/diff-checker`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/og-preview`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/robots-txt-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/schema-markup-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/slug-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/css-gradient-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/color-converter`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/box-shadow-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/ai-content-detector`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/plagiarism-checker`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/html-editor`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/html-tag-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/plagiarism-remover`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/code-formatter`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/youtube-tag-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/text-to-speech`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/qr-code-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/image-compressor`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/cron-expression-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/ai-prompt-generator`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/ai-cv-builder`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/seo-title-analyzer`, lastModified: LAST_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
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
