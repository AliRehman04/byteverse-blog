import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Clock, Calendar, ArrowLeft, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { Newsletter } from "@/components/newsletter";
import { AdUnit } from "@/components/adsense";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!db) return { title: "Post Not Found" };

  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  const post = result[0];
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    keywords: post.keywords || undefined,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author],
      images: post.coverImage ? [{ url: post.coverImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
    },
    alternates: {
      canonical: `${siteConfig.url}/blog/${slug}`,
    },
  };
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  if (!db) notFound();

  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  const post = result[0];
  if (!post || !post.published) notFound();

  let category = null;
  if (post.categoryId) {
    const catResult = await db
      .select()
      .from(categories)
      .where(eq(categories.id, post.categoryId))
      .limit(1);
    category = catResult[0] || null;
  }

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage || undefined,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/blog/${post.slug}`,
    },
  };

  // Track view
  void fetch(`${siteConfig.url}/api/views/${post.slug}`, { method: "POST" }).catch(() => {});

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary font-medium mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-10 animate-fade-in">
          {category && (
            <Link
              href={`/category/${category.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md mb-4"
              style={{ backgroundColor: category.color + "15", color: category.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </Link>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 leading-tight">
            {post.title}
          </h1>

          <p className="text-muted-foreground mb-6 leading-relaxed">{post.excerpt}</p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground pb-6 border-b border-border">
            <span className="font-semibold text-foreground">{post.author}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(post.createdAt)}
            </span>
            {post.readingTime && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {post.readingTime}
                </span>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              {post.views} views
            </span>
          </div>
        </header>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative aspect-video rounded-xl overflow-hidden mb-10">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
        )}

        {/* Ad before content */}
        <AdUnit slot="blog-top" format="horizontal" />

        {/* Content */}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Ad after content */}
        <AdUnit slot="blog-bottom" format="horizontal" />

        {/* Tags */}
        <div className="mt-12 pt-6 border-t border-border">
          {post.keywords && (
            <div className="flex flex-wrap gap-2">
              {post.keywords.split(",").map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground"
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter */}
        <div className="mt-12">
          <Newsletter />
        </div>
      </article>
    </>
  );
}
