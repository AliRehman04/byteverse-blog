import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { authors, categories, posts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  publisher: "ByteVerse",
  keywords: ["sitemap", "ByteVerse pages", "blog directory"],
  title: "HTML Sitemap",
  description: "Browse all major ByteVerse pages including blog posts, categories, authors, and tools.",
  alternates: {
    canonical: `${siteConfig.url}/site-map`,
  },
};

const tools = [
  ["JSON Formatter", "/tools/json-formatter"],
  ["Password Generator", "/tools/password-generator"],
  ["Meta Tag Generator", "/tools/meta-tag-generator"],
  ["Base64 Encoder & Decoder", "/tools/base64-encoder-decoder"],
  ["Word Counter", "/tools/word-counter"],
  ["llms.txt Validator", "/tools/llms-txt-generator-validator"],
  ["Regex Tester", "/tools/regex-tester"],
  ["JWT Decoder", "/tools/jwt-decoder"],
  ["Hash Generator", "/tools/hash-generator"],
  ["UUID Generator", "/tools/uuid-generator"],
  ["Timestamp Converter", "/tools/timestamp-converter"],
  ["URL Encoder & Decoder", "/tools/url-encoder-decoder"],
  ["Diff Checker", "/tools/diff-checker"],
  ["OG Preview", "/tools/og-preview"],
  ["robots.txt Generator", "/tools/robots-txt-generator"],
  ["Schema Markup Generator", "/tools/schema-markup-generator"],
  ["Slug Generator", "/tools/slug-generator"],
  ["CSS Gradient Generator", "/tools/css-gradient-generator"],
  ["Color Converter", "/tools/color-converter"],
  ["Box Shadow Generator", "/tools/box-shadow-generator"],
  ["AI Content Detector", "/tools/ai-content-detector"],
  ["Plagiarism Checker", "/tools/plagiarism-checker"],
  ["HTML Editor", "/tools/html-editor"],
  ["HTML Tag Generator", "/tools/html-tag-generator"],
  ["Plagiarism Remover", "/tools/plagiarism-remover"],
  ["Code Formatter", "/tools/code-formatter"],
  ["YouTube Tag Generator", "/tools/youtube-tag-generator"],
  ["Text to Speech", "/tools/text-to-speech"],
  ["QR Code Generator", "/tools/qr-code-generator"],
  ["Image Compressor", "/tools/image-compressor"],
  ["Cron Expression Generator", "/tools/cron-expression-generator"],
  ["AI Prompt Generator", "/tools/ai-prompt-generator"],
  ["AI CV Builder", "/tools/ai-cv-builder"],
  ["SEO Title Analyzer", "/tools/seo-title-analyzer"],
] as const;

function LinkList({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map(([label, href]) => (
        <li key={href}>
          <Link href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export const revalidate = 21600;

export default async function HtmlSitemapPage() {
  const latestPosts = db
    ? await db
        .select({ title: posts.title, slug: posts.slug })
        .from(posts)
        .where(eq(posts.published, true))
        .orderBy(desc(posts.createdAt))
    : [];

  const allCategories = db
    ? await db.select({ name: categories.name, slug: categories.slug }).from(categories)
    : [];

  const allAuthors = db
    ? await db.select({ name: authors.name, slug: authors.slug }).from(authors)
    : [];

  const staticLinks = [
    ["Home", "/"],
    ["Blog", "/blog"],
    ["Categories", "/categories"],
    ["Tools", "/tools"],
    ["About", "/about"],
    ["Contact", "/contact"],
    ["Privacy Policy", "/privacy"],
    ["Terms of Service", "/terms"],
    ["Disclaimer", "/disclaimer"],
  ] as const;

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ByteVerse HTML Sitemap",
    url: `${siteConfig.url}/site-map`,
    description: "Browse all major ByteVerse pages including tools, blog posts, categories, and author pages.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }} />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">HTML Sitemap</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">All important ByteVerse pages in one place</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Use this page to browse core sections, tools, authors, categories, and every published blog post.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold mb-4">Core Pages</h2>
            <LinkList items={staticLinks} />
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold mb-4">Tools</h2>
            <LinkList items={tools} />
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold mb-4">Categories</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {allCategories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/category/${category.slug}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold mb-4">Authors</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {allAuthors.map((author) => (
                <li key={author.slug}>
                  <Link href={`/author/${author.slug}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {author.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Published Blog Posts</h2>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {latestPosts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </>
  );
}