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
import { MarkdownRenderer } from "@/components/markdown-renderer";

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

  // JSON-LD structured data (auto-generated from post data)
  const wordCount = post.content.split(/\s+/).length;
  const readingMinutes = Math.ceil(wordCount / 200);

  // Auto-extract FAQs from content (matches ## FAQ or ### heading with ? in it)
  const faqRegex = /#{2,3}\s+(.+\?)\s*\n+([\s\S]*?)(?=\n#{2,3}\s|\n*$)/g;
  const faqs: { question: string; answer: string }[] = [];
  let faqMatch;
  while ((faqMatch = faqRegex.exec(post.content)) !== null) {
    const answer = faqMatch[2].trim().replace(/\n+/g, " ").replace(/[#*_`>-]/g, "").trim();
    if (answer.length > 10) {
      faqs.push({ question: faqMatch[1].trim(), answer });
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    image: post.coverImage || undefined,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    wordCount,
    timeRequired: `PT${readingMinutes}M`,
    author: {
      "@type": "Person",
      name: post.author,
      url: `${siteConfig.url}/author/${post.author.toLowerCase().replace(/\s+/g, "-")}`,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/blog/${post.slug}`,
    },
    url: `${siteConfig.url}/blog/${post.slug}`,
    ...(post.keywords ? { keywords: post.keywords } : {}),
    ...(category ? {
      articleSection: category.name,
      about: {
        "@type": "Thing",
        name: category.name,
      },
    } : {}),
    inLanguage: "en-US",
    isAccessibleForFree: true,
  };

  // FAQ schema (auto-extracted from content headings with ?)
  const faqLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  } : null;

  // Breadcrumb schema
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteConfig.url}/blog` },
      ...(category
        ? [{ "@type": "ListItem", position: 3, name: category.name, item: `${siteConfig.url}/category/${category.slug}` }]
        : []),
      { "@type": "ListItem", position: category ? 4 : 3, name: post.title, item: `${siteConfig.url}/blog/${post.slug}` },
    ],
  };

  // Track view
  void fetch(`${siteConfig.url}/api/views/${post.slug}`, { method: "POST" }).catch(() => {});

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <article>
        {/* Article Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute bottom-0 -left-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl animate-float-reverse" />
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-10 pb-12 md:pt-14 md:pb-16">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white font-medium mb-8 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Blog
            </Link>

            <div className="animate-fade-in-up">
              {category && (
                <Link
                  href={`/category/${category.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-5 border border-white/10 backdrop-blur-sm"
                  style={{ backgroundColor: category.color + "25", color: category.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                  {category.name}
                </Link>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight mb-5 leading-[1.15]">
                {post.title}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed">{post.excerpt}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <span className="font-semibold text-white">{post.author}</span>
                <span className="w-1 h-1 rounded-full bg-slate-500" />
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {formatDate(post.createdAt)}
                </span>
                {post.readingTime && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {post.readingTime}
                    </span>
                  </>
                )}
                <span className="w-1 h-1 rounded-full bg-slate-500" />
                <span className="flex items-center gap-1.5">
                  <Eye size={14} />
                  {post.views} views
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
            <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
            </svg>
          </div>
        </section>

        {/* Article Body */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          {/* Cover Image */}
          {post.coverImage && (
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-12 ring-1 ring-border">
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
          <MarkdownRenderer content={post.content} />

          {/* Ad after content */}
          <AdUnit slot="blog-bottom" format="horizontal" />

          {/* Tags */}
          {post.keywords && (
            <div className="mt-14 pt-8 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {post.keywords.split(",").map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    #{tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Newsletter */}
          <div className="mt-14">
            <Newsletter />
          </div>
        </div>
      </article>
    </>
  );
}
