import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { PostCard, FeaturedPostCard } from "@/components/post-card";
import { LazyNewsletter } from "@/components/lazy-newsletter";
import { siteConfig } from "@/lib/config";
import { TrendingUp, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react";

const POSTS_PER_PAGE = 30;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const isFirstPage = currentPage === 1;
  const pageLabel = isFirstPage ? "" : ` - Page ${currentPage}`;
  const title = `Blog${pageLabel} | Latest Articles on AI, Tech & Productivity`;
  const description = isFirstPage
    ? "Read the latest articles, tutorials, and guides on AI tools, tech trends, productivity hacks, coding tips, and honest software reviews at ByteVerse."
    : `Page ${currentPage} of the ByteVerse blog. Browse articles on AI tools, tech guides, coding tutorials, and productivity tips.`;

  return {
    title,
    description,
    openGraph: {
      title: `Blog${pageLabel} | Latest Articles on AI, Tech & Productivity | ByteVerse`,
      description:
        "Read the latest articles, tutorials, and guides on AI tools, tech trends, productivity hacks, coding tips, and honest software reviews.",
      url: isFirstPage ? `${siteConfig.url}/blog` : `${siteConfig.url}/blog?page=${currentPage}`,
      type: "website",
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "ByteVerse Blog" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage],
    },
    alternates: {
      canonical: isFirstPage ? `${siteConfig.url}/blog` : `${siteConfig.url}/blog?page=${currentPage}`,
    },
    ...(isFirstPage ? {} : { robots: { index: false, follow: true } }),
  };
}

export const revalidate = 60;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  let allPosts: (typeof import("@/lib/db/schema").posts.$inferSelect)[] = [];
  let allCategories: (typeof import("@/lib/db/schema").categories.$inferSelect)[] = [];
  let totalPosts = 0;
  let popularPosts: (typeof import("@/lib/db/schema").posts.$inferSelect)[] = [];
  let allPublishedPosts: (typeof import("@/lib/db/schema").posts.$inferSelect)[] = [];

  if (db) {
    const [countResult] = await db
      .select({ total: count() })
      .from(posts)
      .where(eq(posts.published, true));
    totalPosts = countResult?.total ?? 0;

    allPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt))
      .limit(POSTS_PER_PAGE)
      .offset((currentPage - 1) * POSTS_PER_PAGE);

    popularPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.views))
      .limit(5);

    allPublishedPosts = await db
      .select({ id: posts.id, categoryId: posts.categoryId })
      .from(posts)
      .where(eq(posts.published, true)) as typeof allPublishedPosts;

    allCategories = await db.select().from(categories);
  }

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
  const isFirstPage = currentPage === 1;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ByteVerse Blog",
    description: "Guides, tutorials, and reviews on AI tools, coding, tech, and productivity.",
    url: `${siteConfig.url}/blog`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalPosts,
      itemListElement: allPosts.slice(0, 10).map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteConfig.url}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      {/* Page Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 -left-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl animate-float-reverse" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-blue-300 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Our Blog
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              Latest Articles
            </h1>
            <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
              Guides, tutorials, and reviews. All tested before we hit publish.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
          </svg>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {allPosts.length > 0 ? (
          <>
            {/* Featured Hero Post (page 1 only) */}
            {isFirstPage && (
              <FeaturedPostCard
                post={allPosts[0]}
                category={categoryMap.get(allPosts[0].categoryId ?? 0)}
                featured
              />
            )}

            {/* Main content + Sidebar */}
            <div className={`${isFirstPage ? 'mt-10 md:mt-12' : ''} grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-10`}>
              {/* Articles List */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {isFirstPage ? 'Latest Articles' : `Articles - Page ${currentPage}`}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{totalPosts} articles published</p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  {(isFirstPage ? allPosts.slice(1) : allPosts).map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      category={categoryMap.get(post.categoryId ?? 0)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                    {currentPage > 1 ? (
                      <Link
                        href={currentPage === 2 ? '/blog' : `/blog?page=${currentPage - 1}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                      >
                        <ChevronLeft size={16} /> Previous
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-muted/50 text-muted-foreground cursor-not-allowed">
                        <ChevronLeft size={16} /> Previous
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Link
                          key={page}
                          href={page === 1 ? '/blog' : `/blog?page=${page}`}
                          className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                            page === currentPage
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border bg-card hover:bg-muted'
                          }`}
                        >
                          {page}
                        </Link>
                      ))}
                    </div>

                    {currentPage < totalPages ? (
                      <Link
                        href={`/blog?page=${currentPage + 1}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                      >
                        Next <ChevronRight size={16} />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-muted/50 text-muted-foreground cursor-not-allowed">
                        Next <ChevronRight size={16} />
                      </span>
                    )}
                  </nav>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Trending Posts */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
                    <TrendingUp size={16} className="text-primary" />
                    Popular Now
                  </h3>
                  <div className="space-y-3">
                    {popularPosts.map((post, i) => (
                        <Link
                          key={post.id}
                          href={`/blog/${post.slug}`}
                          className="group flex items-start gap-3 py-2 border-b border-border last:border-0"
                        >
                          <span className="text-lg font-extrabold text-muted-foreground/40 group-hover:text-primary transition-colors w-6 shrink-0 leading-tight">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {post.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(post.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>

                {/* Categories */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
                    <FolderOpen size={16} className="text-primary" />
                    Categories
                  </h3>
                  <div className="space-y-1.5">
                    {allCategories.map((cat) => {
                      const catCount = allPublishedPosts.filter((p) => p.categoryId === cat.id).length;
                      return (
                        <Link
                          key={cat.id}
                          href={`/category/${cat.slug}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg text-sm hover:bg-muted transition-colors group"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-foreground group-hover:text-primary transition-colors">
                              {cat.name}
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
                            {catCount}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Newsletter */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <LazyNewsletter compact />
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="text-center py-24 mb-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">📝</span>
            </div>
            <h2 className="text-xl font-bold mb-2">No articles yet</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;re working on amazing content. Check back soon!
            </p>
          </div>
        )}
      </div>
    </>
  );
}
