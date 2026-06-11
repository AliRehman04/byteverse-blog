import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories, authors } from "@/lib/db/schema";
import { eq, ne, desc, and, asc } from "drizzle-orm";
import { Clock, Calendar, ArrowLeft, Share2, ChevronRight, User, Wrench, RefreshCw, BookOpen } from "lucide-react";
import { formatDate, shimmerBlur, getAccessibleBadgeStyle } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { AdUnit } from "@/components/adsense";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  getImageAcquireLicensePage,
  getImageCopyrightNotice,
  getImageCreditText,
  getImageCreator,
  getImageLicenseUrl,
  getPostDisplayImage,
  getPostSeoImages,
  getSiteLogoImageSchema,
  isSameImageUrl,
  toImageObjectSchema,
} from "@/lib/image-seo";
import { BlogPostWidgets, BlogPostToc, BlogPostComments, BlogPostShare, BlogPostBookmark, BlogPostReactions } from "@/components/blog-post-widgets";
import { LazyNewsletter } from "@/components/lazy-newsletter";
import { KeyTakeaways } from "@/components/key-takeaways";
import { AffiliateCTA } from "@/components/affiliate-cta";

/* ── Recommended Tools by Category ────────────────────── */
const CATEGORY_TOOLS: Record<string, { name: string; slug: string; desc: string }[]> = {
  "ai-tools": [
    { name: "AI Content Detector", slug: "ai-content-detector", desc: "Detect AI-generated text" },
    { name: "Plagiarism Remover", slug: "plagiarism-remover", desc: "Rewrite & humanize AI text" },
    { name: "Plagiarism Checker", slug: "plagiarism-checker", desc: "Check text uniqueness" },
  ],
  "tech-guides": [
    { name: "JSON Formatter", slug: "json-formatter", desc: "Format & validate JSON" },
    { name: "JSON to CSV", slug: "json-to-csv", desc: "Convert JSON data to CSV" },
    { name: "Markdown to HTML", slug: "markdown-to-html", desc: "Convert Markdown to HTML" },
  ],
  coding: [
    { name: "Diff Checker", slug: "diff-checker", desc: "Compare texts side by side" },
    { name: "JSON Formatter", slug: "json-formatter", desc: "Format & validate JSON" },
    { name: "Regex Tester", slug: "regex-tester", desc: "Test regex with highlighting" },
  ],
  productivity: [
    { name: "Word Counter", slug: "word-counter", desc: "Words, chars & reading time" },
    { name: "Lorem Ipsum Generator", slug: "lorem-ipsum-generator", desc: "Generate placeholder text" },
    { name: "Privacy Policy Generator", slug: "privacy-policy-generator", desc: "Generate privacy policies" },
  ],
  "software-reviews": [
    { name: "Meta Tag Generator", slug: "meta-tag-generator", desc: "SEO meta tags with preview" },
    { name: "Schema Markup", slug: "schema-markup-generator", desc: "JSON-LD structured data" },
    { name: "OG Preview", slug: "og-preview", desc: "Social media link preview" },
  ],
  cybersecurity: [
    { name: "Password Generator", slug: "password-generator", desc: "Strong random passwords" },
    { name: "Hash Generator", slug: "hash-generator", desc: "SHA-256, SHA-512 hashes" },
    { name: "JWT Decoder", slug: "jwt-decoder", desc: "Decode & inspect JWTs" },
  ],
};

const DEFAULT_TOOLS = [
  { name: "Word Counter", slug: "word-counter", desc: "Words, chars & reading time" },
  { name: "JSON Formatter", slug: "json-formatter", desc: "Format & validate JSON" },
  { name: "AI Content Detector", slug: "ai-content-detector", desc: "Detect AI-generated text" },
];

function RecommendedTools({ categorySlug }: { categorySlug?: string | null }) {
  const tools = (categorySlug && CATEGORY_TOOLS[categorySlug]) || DEFAULT_TOOLS;
  return (
    <section className="mt-12 pt-8 border-t border-border">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Wrench size={16} className="text-primary" />
          </span>
          Recommended Tools
        </h2>
        <Link href="/tools" className="group text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
          All Tools
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group relative p-5 rounded-2xl bg-gradient-to-br from-card to-muted/30 ring-1 ring-border hover:ring-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors mb-1.5">{tool.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
              Try it free <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

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

  if (coverImage) {
    cleaned = cleaned.replace(/(?:^|\n{1,2})!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)\s*(?=\n|$)/g, (match, imageUrl) => {
      return isSameImageUrl(imageUrl, coverImage) ? "\n" : match;
    }).trimStart();
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
      types: {
        "application/amp+html": `${siteConfig.url}/stories/${slug}`,
      },
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
  const authorSlug = post.author.toLowerCase().replace(/\s+/g, "-");
  let authorData = null;
  let relatedPosts: (typeof post)[] = [];

  // Parallelize all secondary DB queries
  const [catResult, authorResult, relatedResult, allPostLinks, clusterPosts] = await Promise.all([
    post.categoryId
      ? db.select().from(categories).where(eq(categories.id, post.categoryId)).limit(1)
      : Promise.resolve([]),
    db.select().from(authors).where(eq(authors.slug, authorSlug)).limit(1).catch(() => []),
    post.categoryId
      ? db.select().from(posts)
          .where(and(eq(posts.categoryId, post.categoryId), ne(posts.id, post.id), eq(posts.published, true)))
          .orderBy(desc(posts.createdAt))
          .limit(3)
          .catch(() => [] as (typeof post)[])
      : Promise.resolve([] as (typeof post)[]),
    db.select({ title: posts.title, slug: posts.slug })
      .from(posts)
      .where(eq(posts.published, true))
      .catch(() => [] as { title: string; slug: string }[]),
    post.categoryId
      ? db.select({ id: posts.id, title: posts.title, slug: posts.slug })
          .from(posts)
          .where(and(eq(posts.categoryId, post.categoryId), eq(posts.published, true)))
          .orderBy(asc(posts.createdAt))
          .limit(20)
          .catch(() => [] as { id: number; title: string; slug: string }[])
      : Promise.resolve([] as { id: number; title: string; slug: string }[]),
  ]);

  category = catResult[0] || null;
  authorData = authorResult[0] || null;
  relatedPosts = relatedResult;

  // Fill up related posts if needed
  if (relatedPosts.length < 3) {
    try {
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
    } catch { /* ignore */ }
  }
  const wordCount = post.content.split(/\s+/).length;
  const readingMinutes = Math.ceil(wordCount / 200);
  const postUrl = `${siteConfig.url}/blog/${post.slug}`;
  const seoImages = getPostSeoImages({
    title: post.title,
    coverImage: post.coverImage,
    content: post.content,
  });
  const primaryImage = seoImages[0]?.url || getPostDisplayImage(post);
  const articleContent = removeDuplicatedPostIntro(post.content, post.title, primaryImage);

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

  // Auto-extract HowTo steps (matches numbered list items under a "How to" heading)
  const howToMatch = post.content.match(/#{2,3}\s+(How\s+to\s+.+?)\s*\n+([\s\S]*?)(?=\n#{2,3}\s|\n*$)/i);
  const howToSteps: { name: string; text: string }[] = [];
  if (howToMatch) {
    const stepRegex = /(?:^|\n)\d+\.\s+\*\*(.+?)\*\*[:\s]*(.+)/g;
    let stepMatch;
    while ((stepMatch = stepRegex.exec(howToMatch[2])) !== null) {
      howToSteps.push({ name: stepMatch[1].trim(), text: stepMatch[2].trim().replace(/[*_`]/g, "") });
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    image: seoImages.length > 0 ? toImageObjectSchema(seoImages[0], true) : undefined,
    thumbnailUrl: seoImages[0]?.url,
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
      logo: getSiteLogoImageSchema(),
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
    mainEntity: faqs.slice(0, 5).map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  } : null;

  // HowTo schema (auto-extracted from numbered steps under "How to" headings)
  const howToLd = howToSteps.length >= 2 && howToMatch ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howToMatch[1].trim(),
    description: post.metaDescription || post.excerpt,
    step: howToSteps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
    totalTime: `PT${readingMinutes}M`,
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
      {howToLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
        />
      )}

      <article>
        <BlogPostWidgets slug={post.slug} url={postUrl} title={post.title} readingMinutes={readingMinutes} />
        {/* ========== HERO HEADER ========== */}
        <section className="hero-bg relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
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
                  style={getAccessibleBadgeStyle(category.color)}
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
                    {authorData?.role && <span className="text-xs text-slate-400">{authorData.role}</span>}
                  </div>
                </Link>
                <span className="w-px h-5 bg-slate-600 hidden sm:block" />
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {formatDate(post.createdAt)}
                </span>
                {post.updatedAt.getTime() - post.createdAt.getTime() > 86400000 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <RefreshCw size={13} />
                      Updated {formatDate(post.updatedAt)}
                    </span>
                  </>
                )}
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
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-2 pb-10 md:pt-4 md:pb-14">
          <div className="min-w-0">
              {/* Cover Image */}
              {primaryImage && (
                <figure className="mb-10" itemScope itemType="https://schema.org/ImageObject">
                  <div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-border shadow-lg">
                    <Image
                      src={primaryImage}
                      alt={seoImages[0]?.alt || post.title}
                      title={post.title}
                      fill
                      priority
                      unoptimized={primaryImage.endsWith(".svg")}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 800px"
                      placeholder="blur"
                      blurDataURL={shimmerBlur}
                      itemProp="contentUrl"
                    />
                  </div>
                  <meta itemProp="width" content="1200" />
                  <meta itemProp="height" content="675" />
                  <meta itemProp="description" content={seoImages[0]?.alt || post.title} />
                  <span itemProp="creator" itemScope itemType="https://schema.org/Organization">
                    <meta itemProp="name" content={getImageCreator(primaryImage).name} />
                    <link itemProp="url" href={getImageCreator(primaryImage).url} />
                  </span>
                  <meta itemProp="creditText" content={getImageCreditText(primaryImage)} />
                  <meta itemProp="copyrightNotice" content={getImageCopyrightNotice(primaryImage)} />
                  <link itemProp="license" href={getImageLicenseUrl(primaryImage)} />
                  <link itemProp="acquireLicensePage" href={getImageAcquireLicensePage(primaryImage)} />
                  <meta itemProp="caption" content={`${post.title} visual summary`} />
                </figure>
              )}

              {/* Ad before content */}
              <AdUnit slot="blog-top" format="horizontal" />

              {/* Post Series / Cluster Navigation */}
              {clusterPosts.length > 2 && category && (
                <nav className="my-8 p-5 rounded-2xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={16} className="text-primary" />
                    <h3 className="text-sm font-bold">
                      More in <span style={{ color: category.color }}>{category.name}</span>
                    </h3>
                    <span className="text-xs text-muted-foreground ml-auto">{clusterPosts.length} articles</span>
                  </div>
                  <ol className="space-y-1">
                    {clusterPosts.map((cp, i) => {
                      const isCurrent = cp.slug === post.slug;
                      return (
                        <li key={cp.id}>
                          {isCurrent ? (
                            <span className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                              <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                              {cp.title}
                              <span className="text-[10px] uppercase tracking-wider ml-auto shrink-0 opacity-70">Reading</span>
                            </span>
                          ) : (
                            <Link
                              href={`/blog/${cp.slug}`}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <span className="shrink-0 w-5 h-5 rounded-full bg-muted-foreground/15 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                              <span className="truncate">{cp.title}</span>
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </nav>
              )}

              {/* Key Takeaways */}
              {post.summary && <KeyTakeaways summary={post.summary} />}

              {/* Table of Contents */}
              <BlogPostToc />

              {/* Markdown Content */}
              <MarkdownRenderer content={articleContent} postLinks={allPostLinks} currentSlug={post.slug} />

              {/* Affiliate Recommendations */}
              <AffiliateCTA slug={post.slug} />

              {/* Ad after content */}
              <AdUnit slot="blog-bottom" format="horizontal" />

              {/* Share Buttons */}
              <div className="mt-10 pt-8 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Share2 size={14} />
                    Share this article
                  </p>
                  <BlogPostBookmark slug={post.slug} title={post.title} />
                </div>
                <BlogPostShare url={postUrl} title={post.title} />
              </div>

              {/* Reactions */}
              <div className="mt-6 pt-6 border-t border-border">
                <BlogPostReactions slug={post.slug} />
              </div>

              {/* Comments */}
              <BlogPostComments />

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

          {/* ========== RECOMMENDED TOOLS ========== */}
          <RecommendedTools categorySlug={category?.slug} />

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
                {relatedPosts.map((related) => {
                  const relatedImage = getPostDisplayImage(related);
                  return (
                  <Link
                    key={related.id}
                    href={`/blog/${related.slug}`}
                    className="group rounded-2xl overflow-hidden ring-1 ring-border bg-card hover:shadow-lg transition-all hover:-translate-y-0.5"
                  >
                    {relatedImage ? (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={relatedImage}
                          alt={related.title}
                          title={related.title}
                          fill
                          unoptimized={relatedImage.endsWith(".svg")}
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
                  );
                })}
              </div>
            </section>
          )}

          {/* ========== NEWSLETTER ========== */}
          <div className="mt-16">
            <LazyNewsletter />
          </div>
        </div>
      </article>
    </>
  );
}
