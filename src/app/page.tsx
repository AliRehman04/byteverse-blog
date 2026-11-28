import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, BookOpenCheck, Bot, Check, Code2, Compass, FileSpreadsheet, Layers, LayoutGrid, Mail, Monitor, Newspaper, Plus, ShieldCheck, SlidersHorizontal, Sparkles, UserRound, Wrench, type LucideIcon } from "lucide-react";
import { HomepageAnalytics } from "@/components/homepage-analytics";
import { HomepageNewsletter } from "@/components/homepage-newsletter";
import { HomepageToolFinder } from "@/components/homepage-tool-finder";
import { siteConfig } from "@/lib/config";
import { getHomepagePosts } from "@/lib/homepage-data";
import {
  formatHomepageDate, getGuideTool, getHomepageCover, getHomepageStructuredData, homepageBenefits, homepageEditor, homepageHero, homepageMeta,
  homepageQuestions, homepageShortcuts, homepageStandards, homepageToolCategories, homepageTools, homepageTopics, homepageTrustLinks,
  serializeHomepageJsonLd, type HomepagePost,
} from "@/lib/homepage";
import { toolCatalog } from "@/lib/tool-catalog";
import { toDirectoryTools } from "@/lib/tools-hub";
import styles from "./home-premium.module.css";

const canonical = `${siteConfig.url.replace(/\/+$/, "")}/`;
const socialAlt = "ByteVerse: free online developer tools and practical tech guides";

export const metadata: Metadata = {
  title: { absolute: homepageMeta.title },
  description: homepageMeta.description,
  publisher: siteConfig.name,
  alternates: { canonical },
  openGraph: {
    type: "website", locale: "en_US", url: canonical, siteName: siteConfig.name,
    title: homepageMeta.title, description: homepageMeta.description,
    images: [{ url: `${canonical}opengraph-image`, width: 1200, height: 630, alt: socialAlt }],
  },
  twitter: {
    card: "summary_large_image", title: homepageMeta.title, description: homepageMeta.description,
    images: [`${canonical}opengraph-image`],
  },
};

export const revalidate = 21600;

const topicIcons = { "ai-tools": Bot, coding: Code2, "tech-guides": Monitor, productivity: SlidersHorizontal, "software-reviews": Layers, cybersecurity: ShieldCheck };
const benefitIcons = { free: BadgeCheck, processing: ShieldCheck, files: FileSpreadsheet, guides: BookOpenCheck };
const searchableTools = toDirectoryTools().map(({ slug, name, category, terms }) => ({ slug, name, category, terms }));
const toolCount = toolCatalog.length;

function SectionHead({ id, icon: Icon, eyebrow, title, lede, link }: { id: string; icon: LucideIcon; eyebrow: string; title: string; lede?: string; link?: { href: string; label: string; event: string } }) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <p className={styles.eyebrow}><Icon size={14} aria-hidden="true" />{eyebrow}</p>
        <h2 id={id} className={styles.sectionTitle}>{title}</h2>
        {lede && <p className={styles.sectionLede}>{lede}</p>}
      </div>
      {link && <Link href={link.href} prefetch={false} className={styles.textLink} data-home-event="cta_click" data-home-label={link.event}>{link.label} <ArrowRight size={15} aria-hidden="true" /></Link>}
    </div>
  );
}

function Byline({ post }: { post: HomepagePost }) {
  return (
    <div className={styles.byline}>
      <span>{post.author || siteConfig.author}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.createdAt.toISOString()}>{formatHomepageDate(post.createdAt)}</time>
      {post.readingTime && <><span aria-hidden="true">·</span><span>{post.readingTime}</span></>}
    </div>
  );
}

function GuideCard({ post }: { post: HomepagePost }) {
  const cover = getHomepageCover(post.coverImage);
  const tool = getGuideTool(post.slug);
  return (
    <article className={styles.guideCard}>
      <div className={styles.guideMedia} data-article-media="featured">
        {cover
          ? <Image src={cover} alt="" fill sizes="(max-width: 640px) 112px, (max-width: 1080px) 48vw, 362px" loading="lazy" />
          : <span className={styles.coverFallback} aria-hidden="true"><BookOpen size={40} strokeWidth={1.2} /></span>}
      </div>
      <div className={styles.guideBody}>
        <p className={styles.storyLabel}>{post.categoryName || "Tech guides"}</p>
        <h3 className={styles.guideTitle}><Link href={`/blog/${encodeURIComponent(post.slug)}`} prefetch={false} className={styles.cardLink} data-home-event="guide_click" data-home-label={post.slug}>{post.title}</Link></h3>
        <p className={styles.guideExcerpt}>{post.excerpt}</p>
        <Byline post={post} />
      </div>
      {tool && <p className={styles.guideTool}><Wrench size={14} aria-hidden="true" />Related tool: <Link href={tool.href} prefetch={false} data-home-event="tool_click" data-home-label={`guide-${post.slug}`}>{tool.name}</Link></p>}
    </article>
  );
}

export default async function HomePage() {
  const { featured, latest } = await getHomepagePosts();

  return (
    <div className={styles.page} data-homepage data-homepage-design="directory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeHomepageJsonLd(getHomepageStructuredData(siteConfig.url)) }} />
      <HomepageAnalytics />

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <p className={styles.heroBadge}><Sparkles size={14} aria-hidden="true" /><span>{homepageHero.badge}</span></p>
          <h1 id="home-title" className={styles.headline}>{homepageHero.headingLead} <span>{homepageHero.headingAccent}</span></h1>
          <p className={styles.heroIntro}>{homepageHero.intro}</p>
          <div className={styles.heroSearch}><HomepageToolFinder tools={searchableTools} placeholder={homepageHero.searchPlaceholder} /></div>
          <nav className={styles.shortcuts} aria-label="Tool shortcuts">
            <span className={styles.shortcutsLabel} aria-hidden="true">Jump to</span>
            <ul>{homepageShortcuts.map((shortcut) => (
              <li key={shortcut.slug}><Link href={shortcut.href} prefetch={false} data-home-shortcut={shortcut.slug} data-home-event="shortcut_click" data-home-label={shortcut.slug}>{shortcut.label}</Link></li>
            ))}</ul>
          </nav>
          <div className={styles.heroActions}>
            <Link href="/tools" prefetch={false} className={styles.primaryCta} data-home-event="cta_click" data-home-label="hero-tools">Explore free tools <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/blog" prefetch={false} className={styles.ghostCta} data-home-event="cta_click" data-home-label="hero-guides">Browse tech guides <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <p className={styles.heroNote}><ShieldCheck size={15} aria-hidden="true" />{homepageHero.note}</p>
        </div>
      </section>

      <section id="featured-tools" className={`${styles.container} ${styles.section}`} aria-labelledby="tools-title">
        <SectionHead id="tools-title" icon={Wrench} eyebrow="Featured tools" title="Free tools to start with" lede="A hand-picked set from the toolkit. Every tool opens without an account." link={{ href: "/tools", label: `All ${toolCount} tools`, event: "tools-all" }} />
        <ul className={styles.toolGrid}>{homepageTools.map((tool) => (
          <li key={tool.slug}>
            <Link href={tool.href} prefetch={false} className={styles.toolCard} data-home-tool={tool.slug} data-home-event="tool_click" data-home-label={tool.slug}>
              <span className={styles.toolTop}>
                <span className={`${styles.toolIcon} ${tool.bg} ${tool.color}`}><tool.icon size={22} aria-hidden="true" /></span>
                <span className={styles.toolCategory}>{tool.category}</span>
              </span>
              <h3 className={styles.toolName}>{tool.name}</h3>
              <span className={styles.toolDetail}>{tool.detail}</span>
              <span className={styles.toolOpen}>Open tool <ArrowUpRight size={15} aria-hidden="true" /></span>
            </Link>
          </li>
        ))}</ul>
      </section>

      <section id="tool-categories" className={styles.band} aria-labelledby="categories-title">
        <div className={`${styles.container} ${styles.section}`}>
          <SectionHead id="categories-title" icon={LayoutGrid} eyebrow="Tool categories" title="Browse tools by the job to be done" lede={`All ${toolCount} tools are grouped into ${homepageToolCategories.length} categories on the tools page.`} />
          <ul className={styles.categoryGrid}>{homepageToolCategories.map((category) => (
            <li key={category.id}>
              <Link href={category.href} prefetch={false} className={styles.categoryCard} style={{ "--tone": category.tone } as React.CSSProperties} data-home-category={category.id} data-home-event="category_click" data-home-label={category.id}>
                <span className={styles.categoryTop}>
                  <span className={styles.categoryIcon}><category.icon size={20} aria-hidden="true" /></span>
                  <span className={styles.categoryCount}>{category.count} tools</span>
                </span>
                <h3 className={styles.categoryName}>{category.title}</h3>
                <span className={styles.categoryBlurb}>{category.blurb}</span>
                <span className={styles.categoryExamples}>{category.examples.join(" · ")}</span>
              </Link>
            </li>
          ))}</ul>
        </div>
      </section>

      <section id="why-byteverse" className={`${styles.container} ${styles.section}`} aria-labelledby="why-title">
        <SectionHead id="why-title" icon={Sparkles} eyebrow="Why ByteVerse" title="Small tools that are honest about what they do" />
        <ul className={styles.benefitGrid}>{homepageBenefits.map((benefit) => {
          const Icon = benefitIcons[benefit.key];
          return (
            <li key={benefit.key} className={styles.benefit}>
              <span className={styles.benefitIcon}><Icon size={20} aria-hidden="true" /></span>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </li>
          );
        })}</ul>
      </section>

      {featured.length > 0 && (
        <section id="featured-stories" className={styles.band} aria-labelledby="featured-guides-title">
          <div className={`${styles.container} ${styles.section}`}>
            <SectionHead id="featured-guides-title" icon={BookOpen} eyebrow="Featured guides" title="Fix the problem in front of you" lede="Step-by-step troubleshooting for the software people use every day." link={{ href: "/blog", label: "All guides", event: "guides-all" }} />
            <div className={styles.guideGrid}>{featured.map((post) => <GuideCard key={post.id} post={post} />)}</div>
          </div>
        </section>
      )}

      <section id="topics" className={`${styles.container} ${styles.section}`} aria-labelledby="topics-title">
        <SectionHead id="topics-title" icon={Compass} eyebrow="Learn by topic" title="Pick a topic and keep reading" />
        <ul className={styles.topicGrid}>{homepageTopics.map((topic) => {
          const Icon = topicIcons[topic.slug];
          return (
            <li key={topic.slug}>
              <Link href={`/category/${topic.slug}`} prefetch={false} className={styles.topicCard} style={{ "--tone": topic.color } as React.CSSProperties} data-home-event="topic_click" data-home-label={topic.slug}>
                <span className={styles.topicIcon}><Icon size={20} aria-hidden="true" /></span>
                <div className={styles.topicText}><h3>{topic.name}</h3><p>{topic.description}</p></div>
                <ArrowUpRight size={16} aria-hidden="true" className={styles.topicArrow} />
              </Link>
            </li>
          );
        })}</ul>
      </section>

      <div className={styles.band}>
        <div className={`${styles.container} ${styles.section} ${styles.latestLayout}`}>
          <section id="latest-guides" aria-labelledby="guides-title" className={styles.latest}>
            <SectionHead id="guides-title" icon={Newspaper} eyebrow="Just published" title="Latest guides" link={{ href: "/blog", label: "Browse the archive", event: "guides-archive" }} />
            {latest.length > 0 ? (
              <ol className={styles.latestList}>{latest.map((post) => (
                <li key={post.id}>
                  <article className={styles.latestItem}>
                    <p className={styles.latestMeta}><time dateTime={post.createdAt.toISOString()}>{formatHomepageDate(post.createdAt)}</time><span aria-hidden="true">·</span><span>{post.categoryName || "Tech guides"}</span></p>
                    <h3 className={styles.latestTitle}><Link href={`/blog/${encodeURIComponent(post.slug)}`} prefetch={false} className={styles.cardLink} data-home-event="guide_click" data-home-label={post.slug}>{post.title}</Link></h3>
                    <ArrowUpRight size={16} aria-hidden="true" className={styles.latestArrow} />
                  </article>
                </li>
              ))}</ol>
            ) : (
              <div className={styles.emptyArticles}><BookOpen size={30} aria-hidden="true" /><h3>Find your next guide.</h3><p>Explore coding tutorials, AI explainers and practical tech guides in the blog.</p><Link href="/blog" prefetch={false} className={styles.primaryCta}>Explore the blog <ArrowRight size={16} aria-hidden="true" /></Link></div>
            )}
          </section>

          <section className={styles.newsletterCard} aria-labelledby="newsletter-title" id="newsletter">
            <span className={styles.mailIcon}><Mail size={22} aria-hidden="true" /></span>
            <p className={styles.eyebrowLight}>Stay in the loop</p>
            <h2 id="newsletter-title" className={styles.newsletterTitle}>New tools. Useful reads.</h2>
            <p className={styles.newsletterIntro}>Get ByteVerse guides and tool updates by email.</p>
            <HomepageNewsletter />
          </section>
        </div>
      </div>

      <section id="about-byteverse" className={`${styles.container} ${styles.section} ${styles.trust}`} aria-labelledby="trust-title">
        <div className={styles.trustIntro}>
          <SectionHead id="trust-title" icon={UserRound} eyebrow="Who runs ByteVerse" title="A small, independent site" />
          <p className={styles.editorBio}>{homepageEditor.bio}</p>
          <div className={styles.editor}>
            <span className={styles.editorAvatar} aria-hidden="true">AR</span>
            <span><Link href={homepageEditor.href} prefetch={false} className={styles.editorName} data-home-event="trust_click" data-home-label="author">{homepageEditor.name}</Link><span className={styles.editorRole}>{homepageEditor.role}</span></span>
          </div>
        </div>
        <div className={styles.trustCard}>
          <h3>What you can expect</h3>
          <ul className={styles.standards}>{homepageStandards.map((standard) => <li key={standard}><Check size={16} aria-hidden="true" /><span>{standard}</span></li>)}</ul>
          <ul className={styles.trustLinks}>{homepageTrustLinks.map((link) => (
            <li key={link.href}><Link href={link.href} prefetch={false} data-home-event="trust_click" data-home-label={link.href.slice(1)}>{link.label}</Link></li>
          ))}</ul>
        </div>
      </section>

      <section id="questions" aria-labelledby="questions-title" className={styles.band}>
        <div className={`${styles.container} ${styles.section} ${styles.questions}`}>
          <div><SectionHead id="questions-title" icon={Sparkles} eyebrow="Good to know" title="Before you dive in" lede="Some context on the tools and the reading." /></div>
          <div>{homepageQuestions.map((faq) => <details key={faq.question} className={styles.question}><summary>{faq.question}<Plus size={18} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.finalSection}`} aria-labelledby="final-title">
        <div className={styles.finalCta}>
          <h2 id="final-title">Pick a tool, or find the fix.</h2>
          <p>The tools and the guides are free to use.</p>
          <div className={styles.heroActions}>
            <Link href="/tools" prefetch={false} className={styles.primaryCta} data-home-event="cta_click" data-home-label="final-tools">Explore free tools <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/blog" prefetch={false} className={styles.ghostCta} data-home-event="cta_click" data-home-label="final-guides">Browse tech guides <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
