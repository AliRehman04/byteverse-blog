import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Cpu, Plus, ServerCog, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { toolCatalog, toolCategories } from "@/lib/tool-catalog";
import { getToolsHubStructuredData, getUpgradedTools, serializeToolsHubJsonLd, toolsHubFaqs, toolsHubMeta } from "@/lib/tools-hub";
import { ToolsDirectory } from "./tools-directory";
import styles from "./tools-hub.module.css";

const baseUrl = siteConfig.url.replace(/\/+$/, "");
const pageUrl = `${baseUrl}/tools`;
const socialImage = { url: `${baseUrl}/api/og/tools`, width: 1200, height: 630, alt: `ByteVerse: ${toolCatalog.length} free online tools for developers, writers and SEO` };

export const metadata: Metadata = {
  title: toolsHubMeta.title,
  description: toolsHubMeta.description,
  keywords: ["free online developer tools", "free developer tools online", "free seo tools online", "free online text tools", "json tools online", "developer utilities", "ByteVerse tools"],
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    url: pageUrl,
    siteName: siteConfig.name,
    title: `${toolsHubMeta.title} | ${siteConfig.name}`,
    description: toolsHubMeta.description,
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${toolsHubMeta.title} | ${siteConfig.name}`,
    description: toolsHubMeta.description,
    images: [socialImage.url],
  },
};

const processingNotes = [
  {
    icon: Cpu,
    title: "Runs in your browser",
    body: "Formatters, converters and generators, plus the CSV, image and comparison tools, process your input on your device. Closing the tab clears unsaved work, so download or copy results you need.",
  },
  {
    icon: ServerCog,
    title: "Labeled server features",
    body: "AI rewriting, AI CV writing and llms.txt website discovery send the text or URL you submit to our server, and the AI features pass it to an AI provider. Speech voices come from your browser or operating system.",
  },
  {
    icon: ShieldCheck,
    title: "Before you paste",
    body: "Avoid confidential data, read the limits listed on each tool page and check our privacy policy for site-wide analytics and advertising.",
  },
] as const;

function linkPhrases(text: string) {
  const parts = text.split(/(privacy policy|contact page)/);
  return parts.map((part, index) => {
    if (part === "privacy policy") return <Link key={index} href="/privacy" prefetch={false}>privacy policy</Link>;
    if (part === "contact page") return <Link key={index} href="/contact" prefetch={false}>contact page</Link>;
    return part;
  });
}

export default function ToolsPage() {
  const upgraded = getUpgradedTools(toolCatalog);

  return (
    <div className={styles.page} data-tools-hub="premium">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeToolsHubJsonLd(getToolsHubStructuredData(siteConfig.url, toolCatalog)) }} />

      <section className={styles.hero} aria-labelledby="tools-hub-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div>
            <nav aria-label="Breadcrumb">
              <ol className={styles.breadcrumb}>
                <li><Link href="/" prefetch={false}>Home</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">Tools</li>
              </ol>
            </nav>
            <p className={styles.heroBadge}><Sparkles size={13} aria-hidden="true" /><span>{toolCatalog.length} free tools · No account · Nothing to install</span></p>
            <h1 id="tools-hub-title" className={styles.headline}>Free online tools for{" "}<span>developers, writers and SEO</span></h1>
            <p className={styles.heroIntro}>{toolsHubMeta.intro}</p>
            <ul className={styles.heroStats} aria-label="Toolkit at a glance">
              <li><strong>{toolCatalog.length}</strong><span>Free tools</span></li>
              <li><strong>{toolCategories.length}</strong><span>Categories</span></li>
              <li><strong>0</strong><span>Sign-ups required</span></li>
            </ul>
          </div>
        </div>
      </section>

      <ToolsDirectory>
        <section className={`${styles.container} ${styles.upgraded}`} aria-labelledby="upgraded-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}><Zap size={13} aria-hidden="true" />Recently upgraded</p>
              <h2 id="upgraded-title" className={styles.sectionTitle}>Rebuilt in October 2026</h2>
              <p className={styles.sectionLead}>These tools gained new workflows, exports and reviewed test suites this autumn. Each one lists its exact limits on its own page.</p>
            </div>
            <a href="#directory" className={styles.textLink}>Browse every category <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
          <ul className={styles.upgradedGrid}>
            {upgraded.map(({ tool, highlight }, index) => (
              <li key={tool.slug}>
                <Link href={`/tools/${tool.slug}`} prefetch={false} className={styles.upgradedCard} data-tone={index % 3} data-upgraded-tool={tool.slug}>
                  <span className={styles.upgradedIcon}><tool.icon size={21} aria-hidden="true" /></span>
                  <span className={styles.upgradedText}><strong>{tool.name}</strong><span>{highlight}</span></span>
                  <span className={styles.upgradedTag}>Updated</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </ToolsDirectory>

      <section className={`${styles.container} ${styles.processing}`} aria-labelledby="processing-title">
        <p className={styles.eyebrow}><ShieldCheck size={13} aria-hidden="true" />Know what runs where</p>
        <h2 id="processing-title" className={styles.sectionTitle}>Clear about processing, every time</h2>
        <p className={styles.sectionLead}>Most tools finish the job on your device. The few features that need a server are labeled before you use them, and nothing here requires an account.</p>
        <div className={styles.processingGrid}>
          {processingNotes.map((note) => (
            <article key={note.title} className={styles.processingCard}>
              <note.icon size={22} aria-hidden="true" />
              <h3>{note.title}</h3>
              <p>{linkPhrases(note.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.container} ${styles.faq}`} aria-labelledby="tools-faq-title" id="tools-faq">
        <div>
          <p className={styles.eyebrow}><BookOpen size={13} aria-hidden="true" />Questions</p>
          <h2 id="tools-faq-title" className={styles.sectionTitle}>Frequently asked questions</h2>
          <p className={styles.sectionLead}>Short answers about cost, data handling and choosing the right tool. Each tool page has its own detailed FAQ.</p>
        </div>
        <div className={styles.faqList}>
          {toolsHubFaqs.map((faq) => (
            <details key={faq.question} className={styles.faqItem}>
              <summary>{faq.question}<Plus size={18} aria-hidden="true" /></summary>
              <p>{linkPhrases(faq.answer)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`${styles.container} ${styles.guides}`} aria-labelledby="guides-title">
        <div>
          <h2 id="guides-title">Need the why, not just the tool?</h2>
          <p>Our tech guides explain the problems behind these tools: fixing CSV imports in Excel, debugging n8n workflows, running local AI models and more.</p>
        </div>
        <div className={styles.guideLinks}>
          <Link href="/category/tech-guides" prefetch={false} className={styles.primaryCta}>Read the tech guides <span><ArrowUpRight size={16} aria-hidden="true" /></span></Link>
          <Link href="/blog" prefetch={false} className={styles.ghostCta}>All articles <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
