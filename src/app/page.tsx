import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Bot, Code2, Layers, Monitor, Plus, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { HomepageNewsletter } from "@/components/homepage-newsletter";
import { siteConfig } from "@/lib/config";
import { getHomepagePosts } from "@/lib/homepage-data";
import { formatHomepageDate, getHomepageCover, getHomepageStructuredData, homepageMeta, homepageQuestions, homepageTools, homepageTopics, serializeHomepageJsonLd } from "@/lib/homepage";
import { toolCatalog } from "@/lib/tool-catalog";
import styles from "./home.module.css";

const canonical = `${siteConfig.url.replace(/\/+$/, "")}/`;

export const metadata: Metadata = {
  title: { absolute: homepageMeta.title },
  description: homepageMeta.description,
  publisher: siteConfig.name,
  alternates: { canonical },
  openGraph: {
    type: "website", locale: "en_US", url: canonical, siteName: siteConfig.name,
    title: homepageMeta.title, description: homepageMeta.description,
    images: [{ url: `${canonical}opengraph-image`, width: 1200, height: 630, alt: "ByteVerse — Free developer tools and practical tech guides" }],
  },
  twitter: {
    card: "summary_large_image", title: homepageMeta.title, description: homepageMeta.description,
    images: [`${canonical}opengraph-image`],
  },
};

export const revalidate = 21600;

const topicIcons = { "ai-tools": Bot, coding: Code2, "tech-guides": Monitor, productivity: SlidersHorizontal, "software-reviews": Layers, cybersecurity: ShieldCheck };
const csvTool = homepageTools.find((tool) => tool.slug === "json-to-csv")!;
const quickTools = homepageTools.filter((tool) => tool.slug === "image-compressor" || tool.slug === "seo-title-analyzer");

export default async function HomePage() {
  const latestPosts = await getHomepagePosts();

  return (
    <div className={styles.page} data-homepage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeHomepageJsonLd(getHomepageStructuredData(siteConfig.url)) }} />

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div>
            <p className={styles.eyebrow}>The everyday developer toolkit</p>
            <h1 id="home-title" className={styles.headline}>Free developer tools.{" "}<span>Practical tech guides.</span></h1>
            <p className={styles.intro}>
              Format messy data, prepare images and check your web content.
              Then dig into guides on code, AI and the tools behind your next project.
            </p>
            <div className={styles.actions}>
              <Link href="/tools" prefetch={false} className={styles.primaryButton}>Explore tools <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link href="#latest-guides" prefetch={false} className={styles.secondaryButton}>Read the guides <BookOpen size={17} aria-hidden="true" /></Link>
            </div>
            <p className={styles.heroNote}><strong>{toolCatalog.length} free tools</strong><span className={styles.noteDivider} aria-hidden="true" />No ByteVerse account required</p>
          </div>

          <div className={styles.workbench}>
            <figure className={styles.example}>
              <figcaption><span className={styles.exampleHeader}><span className={styles.exampleDots} aria-hidden="true"><i /><i /><i /></span>Example · JSON → CSV</span><span className={styles.exampleTitle}>From raw data to useful rows.</span></figcaption>
              <p className={styles.codeLabel}>Input / JSON</p>
              <pre><code>{'[{ "name": "Ada",\n   "role": "Developer" }]'}</code></pre>
              <div className={styles.exampleFlow}><ArrowDown size={18} aria-hidden="true" /></div>
              <div className={styles.exampleOutput}>
                <p className={styles.codeLabel}>Output / CSV preview</p>
                <table aria-label="Example CSV output"><thead><tr><th scope="col">name</th><th scope="col">role</th></tr></thead><tbody><tr><td>Ada</td><td>Developer</td></tr></tbody></table>
              </div>
              <Link href={csvTool.href} prefetch={false} className={styles.exampleLink}>Open the {csvTool.name} <ArrowRight size={16} aria-hidden="true" /></Link>
            </figure>
            <div className={styles.quickLinks}>
              {quickTools.map((tool) => <Link key={tool.slug} href={tool.href} prefetch={false} className={styles.quickLink}><tool.icon size={18} aria-hidden="true" />{tool.task}<ArrowRight size={14} aria-hidden="true" /></Link>)}
            </div>
          </div>
        </div>
      </section>

      <section id="featured-tools" aria-labelledby="tools-title" className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <div><p className={styles.sectionLabel}>01 / The toolkit</p><h2 id="tools-title" className={styles.sectionTitle}>Pick a task. Get into it.</h2><p className={styles.sectionIntro}>A few useful places to start, from data cleanup to the details that help a page look right.</p></div>
          <Link href="/tools" prefetch={false} className={styles.textLink}>Browse all {toolCatalog.length} tools <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className={styles.toolGrid}>
          {homepageTools.map((tool) => (
            <Link key={tool.slug} href={tool.href} prefetch={false} className={styles.toolCard}>
              <span className={styles.toolIcon}><tool.icon size={21} aria-hidden="true" /></span>
              <div><p className={styles.toolTask}>{tool.task}</p><h3 className={styles.toolName}>{tool.name}</h3><p className={styles.toolDescription}>{tool.detail}</p></div>
              <span className={styles.toolArrow}>Open tool <ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
        <div className={styles.processingNote}><ShieldCheck size={17} aria-hidden="true" /><p>Processing and limits vary by tool. Check its notes before using sensitive data. <Link href="#questions" prefetch={false}>How it works</Link></p></div>
      </section>

      <section id="latest-guides" aria-labelledby="guides-title" className={`${styles.journal} ${styles.section}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div><p className={styles.sectionLabel}>02 / The reading room</p><h2 id="guides-title" className={styles.sectionTitle}>A clearer next step.</h2><p className={styles.sectionIntro}>The latest published guides, explainers and comparisons from the ByteVerse blog.</p></div>
            <Link href="/blog" prefetch={false} className={styles.textLink}>All articles <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {latestPosts.length ? (
            <div className={styles.articleGrid}>
              {latestPosts.map((post) => {
                const cover = getHomepageCover(post.coverImage);
                return (
                  <article key={post.id} className={styles.articleCard}>
                    <Link href={`/blog/${encodeURIComponent(post.slug)}`} prefetch={false} className={styles.articleLink}>
                      <div className={styles.articleImage}>
                        {cover ? <Image src={cover} alt="" fill sizes="(max-width: 480px) calc(100vw - 32px), (max-width: 760px) 280px, (max-width: 1248px) 31vw, 384px" loading="lazy" /> : <span className={styles.coverFallback} aria-hidden="true"><BookOpen size={48} strokeWidth={1} /></span>}
                      </div>
                      <div className={styles.articleBody}>
                        <span className={styles.articleCategory}>{post.categoryName || "Tech guide"}</span>
                        <h3 className={styles.articleTitle}>{post.title}</h3>
                        <p className={styles.articleExcerpt}>{post.excerpt}</p>
                        <div className={styles.articleMeta}><time dateTime={post.createdAt.toISOString()}>{formatHomepageDate(post.createdAt)}</time>{post.readingTime && <><span aria-hidden="true">·</span><span>{post.readingTime}</span></>}<ArrowRight size={16} aria-hidden="true" /></div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyArticles}><p>Looking for a walkthrough? Explore the blog or choose a topic below.</p><Link href="/blog" prefetch={false} className={styles.textLink}>Explore the blog <ArrowRight size={16} aria-hidden="true" /></Link></div>
          )}
        </div>
      </section>

      <section aria-labelledby="topics-title" className={`${styles.container} ${styles.section}`}>
        <div className={styles.topicLayout}>
          <div><p className={styles.sectionLabel}>03 / Follow your curiosity</p><h2 id="topics-title" className={styles.sectionTitle}>Go a little deeper.</h2><p className={styles.sectionIntro}>Learning something new or solving a stubborn problem? Start with the topic that fits.</p><Link href="/categories" prefetch={false} className={styles.textLink}>Explore every topic <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <div className={styles.topicGrid}>
            {homepageTopics.map((topic) => {
              const Icon = topicIcons[topic.slug];
              return <Link key={topic.slug} href={`/category/${topic.slug}`} prefetch={false} className={styles.topicLink}><Icon size={20} aria-hidden="true" /><div><h3>{topic.name}</h3><p>{topic.description}</p></div><ArrowRight size={14} aria-hidden="true" /></Link>;
            })}
          </div>
        </div>
        <div className={styles.aboutNote}><p><strong>One place for the doing and the learning.</strong> ByteVerse brings online utilities and practical tech reading together, so you can move from a question to a useful next step.</p><Link href="/about" prefetch={false} className={styles.textLink}>About ByteVerse <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </section>

      <section id="questions" aria-labelledby="questions-title" className={`${styles.questions} ${styles.section}`}>
        <div className={`${styles.container} ${styles.faqLayout}`}>
          <div><p className={styles.sectionLabel}>A few things to know</p><h2 id="questions-title" className={styles.sectionTitle}>Before you dive in.</h2><p className={styles.sectionIntro}>A little context on the tools and the guides.</p></div>
          <div>{homepageQuestions.map((faq) => <details key={faq.question} className={styles.question}><summary>{faq.question}<Plus size={19} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
        </div>
      </section>

      <section aria-labelledby="newsletter-title" className={`${styles.container} ${styles.newsletter}`}>
        <div className={styles.newsletterPanel}>
          <div><p className={styles.sectionLabel}>Keep a little curiosity</p><h2 id="newsletter-title" className={styles.sectionTitle}>Make room for a useful read.</h2><p className={styles.sectionIntro}>Get ByteVerse guides and tool updates by email.</p></div>
          <HomepageNewsletter />
        </div>
      </section>
    </div>
  );
}