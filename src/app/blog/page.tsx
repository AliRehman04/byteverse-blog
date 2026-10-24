import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Bot, Code2, Hash, Layers, Mail, Monitor, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { HomepageNewsletter } from "@/components/homepage-newsletter";
import { siteConfig } from "@/lib/config";
import { blogPageWindow, blogPath, getBlogMeta, getBlogStructuredData, parseBlogPage, safeCategoryColor, serializeJsonLd, type BlogCategory } from "@/lib/blog";
import { getBlogIndex } from "@/lib/blog-data";
import { formatHomepageDate, getHomepageCover, homepageTools, type HomepagePost } from "@/lib/homepage";
import { toolCatalog } from "@/lib/tool-catalog";
import styles from "./blog-premium.module.css";

type SearchParams = Promise<{ page?: string | string[] }>;

const base = siteConfig.url.replace(/\/+$/, "");

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const page = parseBlogPage((await searchParams).page);
  const { title, description } = getBlogMeta(page);
  const url = `${base}${blogPath(page)}`;
  return {
    title: { absolute: title },
    description,
    publisher: siteConfig.name,
    alternates: { canonical: url },
    openGraph: {
      type: "website", locale: "en_US", url, siteName: siteConfig.name, title, description,
      images: [{ url: `${base}/opengraph-image`, width: 1200, height: 630, alt: "ByteVerse blog" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${base}/opengraph-image`] },
  };
}

export const revalidate = 21600;

const categoryIcons: Record<string, typeof Bot> = { "ai-tools": Bot, coding: Code2, "tech-guides": Monitor, productivity: SlidersHorizontal, "software-reviews": Layers, cybersecurity: ShieldCheck };
const sidebarTools = ["image-compressor", "json-formatter", "seo-title-analyzer"].map((slug) => {
  const tool = homepageTools.find((entry) => entry.slug === slug);
  if (!tool) throw new Error(`Missing blog sidebar tool: ${slug}`);
  return tool;
});
const fallbackColor = "#2563eb";

function categoryStyle(category: Pick<BlogCategory, "color">) {
  return { "--tile-color": safeCategoryColor(category.color, fallbackColor) } as React.CSSProperties;
}

function ArticleMedia({ post, lead = false }: { post: HomepagePost; lead?: boolean }) {
  const cover = getHomepageCover(post.coverImage);
  const sizes = lead
    ? "(max-width: 900px) calc(100vw - 32px), (max-width: 1152px) 58vw, 660px"
    : "(max-width: 540px) calc(100vw - 32px), (max-width: 1000px) 48vw, 354px";
  return (
    <div className={styles.articleMedia} data-article-media={lead ? "lead" : "secondary"}>
      {cover ? (
        <Image src={cover} alt="" fill sizes={sizes} loading={lead ? "eager" : "lazy"} fetchPriority={lead ? "high" : undefined} />
      ) : (
        <span className={styles.coverFallback} aria-hidden="true"><BookOpen size={46} strokeWidth={1} /></span>
      )}
      <span className={styles.imageArrow} aria-hidden="true"><ArrowUpRight size={18} /></span>
    </div>
  );
}

function Byline({ post }: { post: HomepagePost }) {
  const author = post.author || siteConfig.author;
  return (
    <div className={styles.byline}>
      <span className={styles.authorAvatar} aria-hidden="true">{author.trim().charAt(0).toUpperCase()}</span>
      <span className={styles.author}>{author}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.createdAt.toISOString()}>{formatHomepageDate(post.createdAt)}</time>
      {post.readingTime && <><span aria-hidden="true">·</span><span>{post.readingTime}</span></>}
    </div>
  );
}

function StoryLabel({ post, categories }: { post: HomepagePost; categories: BlogCategory[] }) {
  const category = categories.find((entry) => entry.slug === post.categorySlug);
  return <p className={styles.storyLabel} style={category ? categoryStyle(category) : undefined}>{post.categoryName || "Tech guides"}</p>;
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parseBlogPage((await searchParams).page);
  const index = await getBlogIndex(page);
  const { posts, popular, categories, total, totalPages } = index;
  const first = page === 1;
  const lead = first ? posts[0] : undefined;
  const feed = first ? posts.slice(1) : posts;
  const activeCategories = categories.filter((category) => category.count > 0);
  const tiles = activeCategories.slice(0, 6);
  const pages = blogPageWindow(page, totalPages);

  return (
    <div className={styles.page} data-blog-index data-blog-design="premium">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(getBlogStructuredData(siteConfig.url, index)) }} />

      <section className={styles.hero} aria-labelledby="blog-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.heroBadge}><Sparkles size={13} aria-hidden="true" /><span>The ByteVerse blog{total > 0 ? ` · ${total} articles` : ""}</span></p>
            <h1 id="blog-title" className={styles.headline}>Guides that fix{" "}<br /><span>real problems.</span></h1>
            <p className={styles.heroIntro}>Troubleshooting walkthroughs, AI tool explainers and software comparisons, written to get you unstuck and back to work.</p>
            <div className={styles.heroActions}>
              <Link href="#articles" prefetch={false} className={styles.primaryCta}>Start reading <span><ArrowRight size={18} aria-hidden="true" /></span></Link>
              <Link href="/tools" prefetch={false} className={styles.ghostCta}>Try the free tools <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <ul className={styles.heroStats} aria-label="Blog at a glance">
              <li><strong>{total}</strong><span>Articles</span></li>
              <li><strong>{activeCategories.length}</strong><span>Topics</span></li>
              <li><strong>Free</strong><span>No paywall</span></li>
            </ul>
          </div>

          <section id="trending" aria-labelledby="trending-title" className={styles.trending}>
            <div className={styles.trendingHead}>
              <span className={styles.trendingLabel}><TrendingUp size={14} aria-hidden="true" />MOST READ</span>
            </div>
            <h2 id="trending-title" className={styles.trendingTitle}>What readers open most.</h2>
            {popular.length > 0 ? (
              <ol className={styles.trendingList}>{popular.map((post) => (
                <li key={post.id}>
                  <Link href={`/blog/${encodeURIComponent(post.slug)}`} prefetch={false} className={styles.trendingLink}>
                    <span><strong>{post.title}</strong><small>{formatHomepageDate(post.createdAt)}{post.readingTime ? ` · ${post.readingTime}` : ""}</small></span>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </li>
              ))}</ol>
            ) : (
              <p className={styles.trendingEmpty}>Popular guides appear here as readers find them.</p>
            )}
            <p className={styles.trendingNote}><ShieldCheck size={14} aria-hidden="true" />Ranked by all-time reads on ByteVerse</p>
          </section>
        </div>
      </section>

      {tiles.length > 0 && (
        <nav className={`${styles.container} ${styles.categoryTiles}`} aria-label="Browse by category">
          {tiles.map((category) => {
            const Icon = categoryIcons[category.slug] ?? Hash;
            return (
              <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} prefetch={false} className={styles.categoryTile} style={categoryStyle(category)}>
                <span className={styles.categoryTileIcon}><Icon size={20} aria-hidden="true" /></span>
                <span className={styles.categoryTileText}><span className={styles.categoryTileName}>{category.name}</span><span className={styles.categoryTileCount}>{category.count} {category.count === 1 ? "article" : "articles"}</span></span>
                <ArrowUpRight size={14} aria-hidden="true" className={styles.categoryTileArrow} />
              </Link>
            );
          })}
        </nav>
      )}

      {lead && (
        <section className={`${styles.container} ${styles.featuredSection}`} aria-label="Latest article" id="featured-story">
          <div className={styles.sectionHeader}>
            <div><p className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" />JUST PUBLISHED</p><h2 className={styles.sectionTitle}>The latest guide.</h2></div>
          </div>
          <article className={styles.leadStory}>
            <Link href={`/blog/${encodeURIComponent(lead.slug)}`} prefetch={false} className={styles.leadLink} aria-labelledby={`story-${lead.id}`}>
              <ArticleMedia post={lead} lead />
              <div className={styles.leadBody}>
                <StoryLabel post={lead} categories={categories} />
                <h3 id={`story-${lead.id}`} className={styles.leadTitle}>{lead.title}</h3>
                <p className={styles.leadExcerpt}>{lead.excerpt}</p>
                <Byline post={lead} />
                <span className={styles.leadCta}>Read the full guide <ArrowRight size={16} aria-hidden="true" /></span>
              </div>
            </Link>
          </article>
        </section>
      )}

      <div className={`${styles.container} ${styles.readingLayout}`}>
        <section id="articles" aria-labelledby="articles-title" className={styles.feed}>
          <div className={styles.sectionHeader}>
            <div><p className={styles.eyebrow}><BookOpen size={13} aria-hidden="true" />ALL ARTICLES</p><h2 id="articles-title" className={styles.sectionTitle}>{first ? "Newest first." : `Archive, page ${page}.`}</h2></div>
            {total > 0 && <p className={styles.sectionMeta}>{totalPages > 1 ? `Page ${page} of ${totalPages}` : `${total} ${total === 1 ? "article" : "articles"}`}</p>}
          </div>
          {feed.length > 0 ? (
            <div className={styles.feedGrid}>{feed.map((post) => (
              <article key={post.id} className={styles.feedStory}>
                <Link href={`/blog/${encodeURIComponent(post.slug)}`} prefetch={false} className={styles.feedLink} aria-labelledby={`story-${post.id}`}>
                  <ArticleMedia post={post} />
                  <div className={styles.feedBody}>
                    <StoryLabel post={post} categories={categories} />
                    <h3 id={`story-${post.id}`} className={styles.feedTitle}>{post.title}</h3>
                    <p className={styles.feedExcerpt}>{post.excerpt}</p>
                    <Byline post={post} />
                  </div>
                </Link>
              </article>
            ))}</div>
          ) : posts.length === 0 ? (
            <div className={styles.emptyArticles}>
              <BookOpen size={32} aria-hidden="true" />
              <h3>{first ? "New guides are on the way." : "Nothing on this page."}</h3>
              <p>{first ? "The archive is being prepared. Try the free tools in the meantime." : "This page is past the end of the archive."}</p>
              <Link href={first ? "/tools" : "/blog"} prefetch={false} className={styles.primaryCta}>{first ? "Explore the tools" : "Back to the latest articles"} <span><ArrowRight size={16} aria-hidden="true" /></span></Link>
            </div>
          ) : null}
          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Pagination">
              {page > 1 ? (
                <Link href={blogPath(page - 1)} prefetch={false} className={styles.pageLink} rel="prev"><ArrowLeft size={16} aria-hidden="true" /><span>Previous</span></Link>
              ) : (
                <span className={styles.pageDisabled} aria-disabled="true"><ArrowLeft size={16} aria-hidden="true" /><span>Previous</span></span>
              )}
              {pages.map((entry, position) => entry === "gap"
                ? <span key={`gap-${position}`} className={styles.pageEllipsis} aria-hidden="true">…</span>
                : entry === page
                  ? <span key={entry} className={styles.pageCurrent} aria-current="page">{entry}</span>
                  : <Link key={entry} href={blogPath(entry)} prefetch={false} className={styles.pageLink} aria-label={`Page ${entry}`}>{entry}</Link>)}
              {page < totalPages ? (
                <Link href={blogPath(page + 1)} prefetch={false} className={styles.pageLink} rel="next"><span>Next</span><ArrowRight size={16} aria-hidden="true" /></Link>
              ) : (
                <span className={styles.pageDisabled} aria-disabled="true"><span>Next</span><ArrowRight size={16} aria-hidden="true" /></span>
              )}
            </nav>
          )}
        </section>

        <aside className={styles.sidebar} aria-label="Explore ByteVerse">
          <section className={styles.toolsCard} aria-labelledby="blog-tools-title">
            <p className={styles.eyebrow}><Wrench size={13} aria-hidden="true" />FREE TOOLS</p>
            <h2 id="blog-tools-title" className={styles.sidebarTitle}>Fix it faster with a tool.</h2>
            {sidebarTools.map((tool) => (
              <Link key={tool.slug} href={tool.href} prefetch={false} data-blog-tool={tool.slug} className={styles.toolLink}>
                <span className={styles.toolIcon}><tool.icon size={19} aria-hidden="true" /></span>
                <span><strong>{tool.name}</strong><small>{tool.task}</small></span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ))}
            <Link href="/tools" prefetch={false} className={styles.toolsAll}>Browse all {toolCatalog.length} tools <ArrowRight size={16} aria-hidden="true" /></Link>
          </section>

          <section className={styles.newsletterCard} aria-labelledby="blog-newsletter-title" id="newsletter">
            <span className={styles.mailIcon}><Mail size={22} aria-hidden="true" /></span>
            <p className={styles.eyebrowLight}>STAY IN THE LOOP</p>
            <h2 id="blog-newsletter-title" className={styles.newsletterTitle}>New guides, by email.</h2>
            <p className={styles.newsletterIntro}>Get ByteVerse articles and tool updates when they publish.</p>
            <HomepageNewsletter />
          </section>

          {categories.length > 0 && (
            <section className={styles.categoryDirectory} aria-labelledby="blog-categories-title">
              <p className={styles.eyebrow}><Layers size={13} aria-hidden="true" />CATEGORIES</p>
              <h2 id="blog-categories-title" className={styles.sidebarTitle}>Explore by topic</h2>
              <nav aria-label="Category directory">{categories.map((category) => {
                const Icon = categoryIcons[category.slug] ?? Hash;
                return (
                  <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} prefetch={false} style={categoryStyle(category)}>
                    <span><Icon size={16} aria-hidden="true" />{category.name}</span>
                    <span className={styles.categoryCount}>{category.count}</span>
                  </Link>
                );
              })}</nav>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
