import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { siteConfig } from "@/lib/config";

export const revalidate = 3600; // refresh every hour

export async function GET() {
  const base = siteConfig.url;
  const lines: string[] = [];

  // Header
  lines.push(`# ${siteConfig.name}`);
  lines.push("");
  lines.push(`> ${siteConfig.description}`);
  lines.push("");

  // About
  lines.push("## About");
  lines.push(`ByteVerse is a tech knowledge hub covering AI tools, coding tutorials, productivity workflows, and software reviews. Every guide is tested before publishing. Visit: ${base}`);
  lines.push("");

  // Main pages
  lines.push("## Main Pages");
  lines.push(`- [Home](${base})`);
  lines.push(`- [Blog](${base}/blog)`);
  lines.push(`- [Categories](${base}/categories)`);
  lines.push(`- [Free Developer Tools](${base}/tools)`);
  lines.push(`- [About](${base}/about)`);
  lines.push(`- [Contact](${base}/contact)`);
  lines.push("");

  // Tools
  const tools = [
    { name: "JSON Formatter & Validator", href: "/tools/json-formatter", desc: "Format, validate, and minify JSON with syntax error detection" },
    { name: "Password Generator", href: "/tools/password-generator", desc: "Generate strong random passwords using Web Crypto API" },
    { name: "Meta Tag Generator", href: "/tools/meta-tag-generator", desc: "Generate SEO meta tags with live Google and social previews" },
    { name: "Base64 Encoder & Decoder", href: "/tools/base64-encoder-decoder", desc: "Encode text to Base64 or decode Base64 with UTF-8 support" },
    { name: "Word & Character Counter", href: "/tools/word-counter", desc: "Count words, characters, sentences, paragraphs, and reading time" },
    { name: "llms.txt Generator & Validator", href: "/tools/llms-txt-generator-validator", desc: "Generate and validate llms.txt files for AI discoverability" },
    { name: "Regex Tester", href: "/tools/regex-tester", desc: "Test regular expressions with live highlighting and match details" },
    { name: "JWT Decoder", href: "/tools/jwt-decoder", desc: "Decode JSON Web Tokens and inspect header, payload, and claims" },
    { name: "Hash Generator", href: "/tools/hash-generator", desc: "Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes" },
    { name: "UUID Generator", href: "/tools/uuid-generator", desc: "Generate UUID v4, v1-like identifiers and validate UUIDs" },
    { name: "Timestamp Converter", href: "/tools/timestamp-converter", desc: "Convert Unix timestamps to human-readable dates and back" },
    { name: "URL Encoder & Decoder", href: "/tools/url-encoder-decoder", desc: "Encode and decode URLs with component and full URI modes" },
    { name: "Diff Checker", href: "/tools/diff-checker", desc: "Compare two texts side by side with line-by-line diff" },
  ];

  lines.push("## Developer Tools (Free, Client-Side)");
  for (const tool of tools) {
    lines.push(`- [${tool.name}](${base}${tool.href}): ${tool.desc}`);
  }
  lines.push("");

  // Categories
  if (db) {
    const allCats = await db.select().from(categories);
    lines.push("## Categories");
    for (const cat of allCats) {
      lines.push(`- [${cat.name}](${base}/category/${cat.slug}): ${cat.description || cat.name}`);
    }
    lines.push("");

    // Blog posts
    const allPosts = await db
      .select({
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt));

    lines.push(`## Blog Posts (${allPosts.length} articles)`);
    for (const post of allPosts) {
      lines.push(`- [${post.title}](${base}/blog/${post.slug}): ${post.excerpt.slice(0, 150)}`);
    }
    lines.push("");
  }

  // Legal
  lines.push("## Legal");
  lines.push(`- [Privacy Policy](${base}/privacy)`);
  lines.push(`- [Terms of Service](${base}/terms)`);
  lines.push(`- [Disclaimer](${base}/disclaimer)`);
  lines.push("");

  const body = lines.join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
