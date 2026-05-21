import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories, authors } from "@/lib/db/schema";
import { eq, ne, desc, and } from "drizzle-orm";
import { Clock, Calendar, ArrowLeft, Share2, ChevronRight, User } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { Newsletter } from "@/components/newsletter";
import { AdUnit } from "@/components/adsense";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ShareButtons } from "@/components/share-buttons";
import { getPostSeoImages, toImageObjectSchema } from "@/lib/image-seo";
import { ViewTracker } from "@/components/view-tracker";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function removeDuplicatedPostIntro(content: string, title: string, coverImage: string | null) {
  let cleaned = content.trimStart();
  const headingMatch = cleaned.match(/^#\s+(.+?)\s*(?:\r?\n|$)/);

  if (headingMatch && normalizeText(headingMatch[1]) === normalizeText(title)) {
    cleaned = cleaned.slice(headingMatch[0].length).trimStart();
  }

  const imageMatch = cleaned.match(/^!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)\s*(?:\r?\n|$)/);
  if (imageMatch) {
    const imageUrl = imageMatch[1];
    const isCoverImage = coverImage ? imageUrl === coverImage : true;
    if (isCoverImage) {
      cleaned = cleaned.slice(imageMatch[0].length).trimStart();
    }
  }

  return cleaned;
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

  const seoImages = getPostSeoImages({
    title: post.title,
    coverImage: post.coverImage,
    content: post.content,
  });

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
      images: seoImages.slice(0, 4).map((image) => ({
        url: image.url,
        width: image.width,
        height: image.height,
        alt: image.alt,
      })),
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      images: seoImages[0] ? [seoImages[0].url] : [],
    },
    alternates: {
      canonical: `${siteConfig.url}/blog/${slug}`,
    },
  };
}

export const revalidate = 60;

export async function generateStaticParams() {
  if (!db) return [];
  const allPosts = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.published, true));
  return allPosts.map((p) => ({ slug: p.slug }));
}

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
  const postUrl = `${siteConfig.url}/blog/${post.slug}`;
  const articleContent = removeDuplicatedPostIntro(post.content, post.title, post.coverImage);
  const seoImages = getPostSeoImages({
    title: post.title,
    coverImage: post.coverImage,
    content: post.content,
  });

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
    image: seoImages.map((image, index) => toImageObjectSchema(image, index === 0)),
    thumbnailUrl: seoImages[0]?.url,
    primaryImageOfPage: seoImages[0] ? toImageObjectSchema(seoImages[0], true) : undefined,
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
      "@id": postUrl,
    },
    url: postUrl,
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

  // Track views via client-side API call (ISR pages can't do server-side tracking reliably)

  // Fetch author info from DB
  const authorSlug = post.author.toLowerCase().replace(/\s+/g, "-");
  let authorData = null;
  try {
    const authorResult = await db
      .select()
      .from(authors)
      .where(eq(authors.slug, authorSlug))
      .limit(1);
    authorData = authorResult[0] || null;
  } catch { /* ignore */ }

  // Fetch related posts (same category, exclude current)
  let relatedPosts: (typeof post)[] = [];
  try {
    if (post.categoryId) {
      relatedPosts = await db
        .select()
        .from(posts)
        .where(and(eq(posts.categoryId, post.categoryId), ne(posts.id, post.id), eq(posts.published, true)))
        .orderBy(desc(posts.createdAt))
        .limit(3);
    }
    if (relatedPosts.length < 3) {
      const moreIds = [post.id, ...relatedPosts.map((p) => p.id)];
      const more = await db
        .select()
        .from(posts)
        .where(eq(posts.published, true))
        .orderBy(desc(posts.views))
        .limit(6);
      for (const p of more) {
        if (!moreIds.includes(p.id) && relatedPosts.length < 3) {
          relatedPosts.push(p);
        }
      }
    }
  } catch { /* ignore */ }

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
        <ViewTracker slug={post.slug} />
        {/* ========== HERO HEADER ========== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute bottom-0 -left-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl animate-float-reverse" />
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
          </div>
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 pb-12 md:pt-14 md:pb-16">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-400 mb-8 flex-wrap">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={14} />
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              {category && (
                <>
                  <ChevronRight size={14} />
                  <Link href={`/category/${category.slug}`} className="hover:text-white transition-colors">{category.name}</Link>
                </>
              )}
            </nav>

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

              <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight mb-6 leading-[1.15]">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed max-w-2xl">{post.excerpt}</p>
              )}

              {/* Author + Meta Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <Link href={`/author/${authorSlug}`} className="flex items-center gap-3 group">
                  {authorData?.avatar ? (
                    <Image
                      src={authorData.avatar}
                      alt={post.author}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full ring-2 ring-white/20 object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full ring-2 ring-white/20 bg-white/10 flex items-center justify-center text-sm font-bold">
                      {post.author.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-white group-hover:text-blue-300 transition-colors block leading-tight">{post.author}</span>
                    {authorData?.role && <span className="text-xs text-slate-500">{authorData.role}</span>}
                  </div>
                </Link>
                <span className="w-px h-5 bg-slate-600 hidden sm:block" />
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
              </div>
            </div>
          </div>
          {/* Wave separator */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
            <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
            </svg>
          </div>
        </section>

        {/* ========== ARTICLE BODY ========== */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="min-w-0">
              {/* Cover Image */}
              {post.coverImage && (
                <div className="relative aspect-video rounded-2xl overflow-hidden mb-10 ring-1 ring-border shadow-lg">
                  <Image
                    src={post.coverImage}
                    alt={seoImages[0]?.alt || post.title}
                    title={post.title}
                    fill
                    priority
                    unoptimized={post.coverImage.endsWith(".svg")}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                </div>
              )}

              {/* Ad before content */}
              <AdUnit slot="blog-top" format="horizontal" />

              {/* Markdown Content */}
              <MarkdownRenderer content={articleContent} />

              {/* Ad after content */}
              <AdUnit slot="blog-bottom" format="horizontal" />

              {/* Share Buttons */}
              <div className="mt-10 pt-8 border-t border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Share2 size={14} />
                  Share this article
                </p>
                <ShareButtons url={postUrl} title={post.title} />
              </div>

              {/* ========== AUTHOR BOX ========== */}
              <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-muted/50 ring-1 ring-border">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <Link href={`/author/${authorSlug}`} className="shrink-0">
                    {authorData?.avatar ? (
                      <Image
                        src={authorData.avatar}
                        alt={post.author}
                        width={72}
                        height={72}
                        className="w-[72px] h-[72px] rounded-2xl object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-2xl bg-primary/10 ring-2 ring-border flex items-center justify-center">
                        <User size={28} className="text-primary" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Written by</p>
                    <Link href={`/author/${authorSlug}`} className="text-lg font-bold text-foreground hover:text-primary transition-colors">
                      {post.author}
                    </Link>
                    {authorData?.role && (
                      <p className="text-sm text-muted-foreground mt-0.5">{authorData.role} at ByteVerse</p>
                    )}
                    {authorData?.bio && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{authorData.bio}</p>
                    )}
                    <Link
                      href={`/author/${authorSlug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 hover:underline"
                    >
                      View all posts <ArrowLeft size={14} className="rotate-180" />
                    </Link>
                  </div>
                </div>
              </div>
          </div>

          {/* ========== RELATED POSTS ========== */}
          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-12 border-t border-border">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                  <span className="w-1 h-7 bg-primary rounded-full" />
                  You Might Also Like
                </h2>
                <Link href="/blog" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                  All Posts <ChevronRight size={14} />
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.id}
                    href={`/blog/${related.slug}`}
                    className="group rounded-2xl overflow-hidden ring-1 ring-border bg-card hover:shadow-lg transition-all hover:-translate-y-0.5"
                  >
                    {related.coverImage ? (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={related.coverImage}
                          alt={related.title}
                          title={related.title}
                          fill
                          unoptimized={related.coverImage.endsWith(".svg")}
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                        <span className="text-4xl font-bold text-muted-foreground/30">{related.title.charAt(0)}</span>
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 mb-2">
                        {related.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(related.createdAt)}</span>
                        {related.readingTime && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span>{related.readingTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ========== NEWSLETTER ========== */}
          <div className="mt-16">
            <Newsletter />
          </div>
        </div>
      </article>
    </>
  );
}
