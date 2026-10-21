import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Bot, Code2, Layers, Mail, Monitor, Plus, ShieldCheck, SlidersHorizontal, Sparkles, Wrench, Zap } from "lucide-react";
import { HomepageNewsletter } from "@/components/homepage-newsletter";
import { HomepageToolFinder } from "@/components/homepage-tool-finder";
import { siteConfig } from "@/lib/config";
import { getHomepagePosts } from "@/lib/homepage-data";
import { formatHomepageDate, getHomepageCover, getHomepageStructuredData, homepageMeta, homepageQuestions, homepageTools, homepageTopics, serializeHomepageJsonLd, type HomepagePost } from "@/lib/homepage";
import { toolCatalog } from "@/lib/tool-catalog";
import styles from "./home-premium.module.css";

const canonical = `${siteConfig.url.replace(/\/+$/, "")}/`;

export const metadata: Metadata = {
  title: { absolute: homepageMeta.title },
  description: homepageMeta.description,
  publisher: siteConfig.name,
  alternates: { canonical },
  openGraph: {
    type: "website", locale: "en_US", url: canonical, siteName: siteConfig.name,
    title: homepageMeta.title, description: homepageMeta.description,
    images: [{ url: `${canonical}opengraph-image`, width: 1200, height: 630, alt: "ByteVerse — Free developer tools, AI and tech guides" }],
  },
  twitter: {
    card: "summary_large_image", title: homepageMeta.title, description: homepageMeta.description,
    images: [`${canonical}opengraph-image`],
  },
};

export const revalidate = 21600;

const topicIcons = { "ai-tools": Bot, coding: Code2, "tech-guides": Monitor, productivity: SlidersHorizontal, "software-reviews": Layers, cybersecurity: ShieldCheck };
const quickToolSlugs = ["image-compressor", "json-to-csv", "json-formatter", "seo-title-analyzer", "invoice-pdf-to-excel", "plagiarism-checker"];
const quickTools = homepageTools.filter((tool) => quickToolSlugs.includes(tool.slug));
const moreTools = homepageTools.filter((tool) => !quickToolSlugs.includes(tool.slug));
const searchableTools = toolCatalog.map(({ slug, name, category, description }) => ({ slug, name, category, terms: description }));

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
  return (
    <div className={styles.byline}>
      <span className={styles.authorAvatar} aria-hidden="true">{(post.author || siteConfig.author).trim().charAt(0).toUpperCase()}</span>
      <span className={styles.author}>{post.author || siteConfig.author}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.createdAt.toISOString()}>{formatHomepageDate(post.createdAt)}</time>
      {post.readingTime && <><span aria-hidden="true">·</span><span>{post.readingTime}</span></>}
    </div>
  );
}

export default async function HomePage() {
  const posts = await getHomepagePosts();
  const [lead] = posts;
  const latest = posts.slice(1);

  return (
    <div className={styles.page} data-homepage data-homepage-design="premium">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeHomepageJsonLd(getHomepageStructuredData(siteConfig.url)) }} />

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.heroBadge}><Sparkles size={13} aria-hidden="true" /><span>{toolCatalog.length} free tools · Practical guides</span></p>
            <h1 id="home-title" className={styles.headline}>Tools for your work.{" "}<br /><span>Ideas for what’s next.</span></h1>
            <p className={styles.heroIntro}>Compress images, convert data and fine-tune your website. Then dive into AI explainers, coding tutorials and the tech guides that help you ship.</p>
            <div className={styles.heroActions}>
              <Link href="/tools" prefetch={false} className={styles.primaryCta}>Explore all tools <span><ArrowUpRight size={18} aria-hidden="true" /></span></Link>
              <Link href="#latest-guides" prefetch={false} className={styles.ghostCta}>Read the guides <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <ul className={styles.heroStats} aria-label="ByteVerse at a glance">
              <li><strong>{toolCatalog.length}</strong><span>Free tools</span></li>
              <li><strong>{homepageTopics.length}</strong><span>Topic hubs</span></li>
              <li><strong>0</strong><span>Sign-ups required</span></li>
            </ul>
          </div>

          <section id="featured-tools" aria-labelledby="tools-title" className={styles.launcher}>
            <div className={styles.launcherHead}>
              <span className={styles.launcherLabel}><Wrench size={14} aria-hidden="true" />THE TOOLKIT</span>
              <Link href="/tools" prefetch={false} className={styles.launcherAll}>All {toolCatalog.length} <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
            <h2 id="tools-title" className={styles.launcherTitle}>What do you need to do?</h2>
            <HomepageToolFinder tools={searchableTools} />
            <div className={styles.quickToolGrid}>{quickTools.map((tool, index) => (
              <Link key={tool.slug} href={tool.href} prefetch={false} className={styles.quickTool} data-home-tool={tool.slug} data-tone={index % 3}>
                <span className={styles.quickToolIcon}><tool.icon size={20} aria-hidden="true" /></span>
                <span className={styles.quickToolText}><strong>{tool.name}</strong><small>{tool.task}</small></span>
                <ArrowUpRight size={15} aria-hidden="true" className={styles.quickToolArrow} />
              </Link>
            ))}</div>
            <p className={styles.launcherNote}><ShieldCheck size={14} aria-hidden="true" />No account needed · Processing varies by tool</p>
          </section>
        </div>
      </section>

      <nav className={`${styles.container} ${styles.topicTiles}`} aria-label="Browse article topics">
        {homepageTopics.map((topic) => {
          const Icon = topicIcons[topic.slug];
          return (
            <Link key={topic.slug} href={`/category/${topic.slug}`} prefetch={false} className={styles.topicTile} style={{ "--tile-color": topic.color } as React.CSSProperties}>
              <span className={styles.topicTileIcon}><Icon size={20} aria-hidden="true" /></span>
              <span className={styles.topicTileName}>{topic.name}</span>
              <ArrowUpRight size={14} aria-hidden="true" className={styles.topicTileArrow} />
            </Link>
          );
        })}
      </nav>

      <section className={`${styles.container} ${styles.featuredSection}`} aria-label="Latest featured guide" id="featured-stories">
        <div className={styles.sectionHeader}>
          <div><p className={styles.eyebrow}><Zap size={13} aria-hidden="true" />LATEST STORY</p><h2 className={styles.sectionTitle}>Fresh from the blog</h2></div>
          <Link href="/blog" prefetch={false} className={styles.textLink}>All articles <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
        {lead ? (
          <article className={styles.leadStory}>
            <Link href={`/blog/${encodeURIComponent(lead.slug)}`} prefetch={false} className={styles.leadLink} aria-labelledby={`story-${lead.id}`}>
              <ArticleMedia post={lead} lead />
              <div className={styles.leadBody}>
                <p className={styles.storyLabel}>{lead.categoryName || "Tech guides"}</p>
                <h3 id={`story-${lead.id}`} className={styles.leadTitle}>{lead.title}</h3>
                <p className={styles.leadExcerpt}>{lead.excerpt}</p>
                <Byline post={lead} />
                <span className={styles.leadCta}>Read the full guide <ArrowRight size={16} aria-hidden="true" /></span>
              </div>
            </Link>
          </article>
        ) : (
          <div className={styles.emptyArticles}><BookOpen size={32} aria-hidden="true" /><h3>Find your next guide.</h3><p>Explore coding tutorials, AI explainers and practical tech guides in the blog.</p><Link href="/blog" prefetch={false} className={styles.primaryCta}>Explore the blog <span><ArrowRight size={16} aria-hidden="true" /></span></Link></div>
        )}
      </section>

      <div className={`${styles.container} ${styles.readingLayout}`}>
        <section id="latest-guides" aria-labelledby="guides-title" className={styles.feed}>
          <div className={styles.sectionHeader}>
            <div><p className={styles.eyebrow}><BookOpen size={13} aria-hidden="true" />KEEP READING</p><h2 id="guides-title" className={styles.sectionTitle}>Practical guides, not guesswork.</h2></div>
            <Link href="/blog" prefetch={false} className={styles.textLink}>View all <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          {latest.length > 0 ? (
            <div className={styles.feedGrid}>{latest.map((post) => (
              <article key={post.id} className={styles.feedStory}>
                <Link href={`/blog/${encodeURIComponent(post.slug)}`} prefetch={false} className={styles.feedLink} aria-labelledby={`story-${post.id}`}>
                  <ArticleMedia post={post} />
                  <div className={styles.feedBody}>
                    <p className={styles.storyLabel}>{post.categoryName || "Tech guides"}</p>
                    <h3 id={`story-${post.id}`} className={styles.feedTitle}>{post.title}</h3>
                    <p className={styles.feedExcerpt}>{post.excerpt}</p>
                    <Byline post={post} />
                  </div>
                </Link>
              </article>
            ))}</div>
          ) : (
            <div className={styles.feedEmpty}><p>There’s more to explore in the archive.</p><Link href="/blog" prefetch={false} className={styles.textLink}>Browse all guides <ArrowRight size={16} aria-hidden="true" /></Link></div>
          )}
          <Link href="/blog" prefetch={false} className={styles.archiveLink}>Browse the full archive <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>

        <aside className={styles.sidebar} aria-label="Explore ByteVerse">
          <section className={styles.moreTools} aria-labelledby="more-tools-title">
            <p className={styles.eyebrow}><Wrench size={13} aria-hidden="true" />MORE TOOLS</p>
            <h2 id="more-tools-title" className={styles.sidebarTitle}>A couple more shortcuts.</h2>
            {moreTools.map((tool) => (
              <Link key={tool.slug} href={tool.href} prefetch={false} data-home-tool={tool.slug} className={styles.moreToolLink}>
                <span className={styles.moreToolIcon}><tool.icon size={19} aria-hidden="true" /></span>
                <span><strong>{tool.name}</strong><small>{tool.detail}</small></span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ))}
            <Link href="/tools" prefetch={false} className={styles.moreToolsAll}>Browse all {toolCatalog.length} tools <ArrowRight size={16} aria-hidden="true" /></Link>
          </section>

          <section className={styles.newsletterCard} aria-labelledby="newsletter-title" id="newsletter">
            <span className={styles.mailIcon}><Mail size={22} aria-hidden="true" /></span>
            <p className={styles.eyebrowLight}>STAY IN THE LOOP</p>
            <h2 id="newsletter-title" className={styles.newsletterTitle}>New tools. Useful reads.</h2>
            <p className={styles.newsletterIntro}>Get ByteVerse guides and tool updates by email.</p>
            <HomepageNewsletter />
          </section>

          <section className={styles.topicDirectory} aria-labelledby="topics-title">
            <p className={styles.eyebrow}><Layers size={13} aria-hidden="true" />TOPICS</p>
            <h2 id="topics-title" className={styles.sidebarTitle}>Explore by topic</h2>
            <nav aria-label="Topic directory">{homepageTopics.map((topic) => {
              const Icon = topicIcons[topic.slug];
              return <Link key={topic.slug} href={`/category/${topic.slug}`} prefetch={false} style={{ "--tile-color": topic.color } as React.CSSProperties}><span><Icon size={16} aria-hidden="true" />{topic.name}</span><ArrowUpRight size={14} aria-hidden="true" /></Link>;
            })}</nav>
          </section>
        </aside>
      </div>

      <section id="questions" aria-labelledby="questions-title" className={styles.questionsSection}>
        <div className={`${styles.container} ${styles.questions}`}>
          <div><p className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" />GOOD TO KNOW</p><h2 id="questions-title" className={styles.sectionTitle}>Before you dive in.</h2><p className={styles.questionsIntro}>Some context on the reading and the tools.</p></div>
          <div>{homepageQuestions.map((faq) => <details key={faq.question} className={styles.question}><summary>{faq.question}<Plus size={18} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
        </div>
      </section>
    </div>
  );
}
