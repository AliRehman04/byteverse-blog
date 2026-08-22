import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Type, FileText, Share2, AtSign, LinkIcon, Smartphone, Wrench, BookOpen, Code2 } from "lucide-react";
import { MetaTagGeneratorTool } from "./meta-tag-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Meta Tag Generator",
  title: "Meta Tag Generator - Free SEO, Google & Social Tags",
  description: "Free meta tag generator for SEO: create title tags, meta descriptions, Open Graph, Twitter cards, and canonical tags for Google and social media. Copy clean HTML.",
  slug: "meta-tag-generator",
  keywords: [
    "meta tag generator",
    "meta tags generator",
    "seo meta tags generator",
    "google meta tag generator",
    "free meta tag generator",
    "social media meta tags generator",
    "meta tag builder",
    "meta tag maker",
    "meta tag creator",
    "meta tag code generator",
    "generate meta tags",
    "open graph generator",
    "open graph tag generator",
    "twitter card generator",
    "meta description generator",
    "meta description generator free",
  ],
  featureList: [
    "Title tag and meta description generator",
    "Open Graph tags for Facebook and LinkedIn",
    "Twitter card tags",
    "Canonical URL tag",
    "Live search and social previews",
    "Copy-ready clean HTML",
  ],
  faqs: [
    {
      question: "How do I generate meta tags for my website?",
      answer: "Fill in your page title, description, and URL in the generator above. It builds the complete HTML — title tag, meta description, Open Graph, Twitter card, and canonical — with a live preview. Copy the code into your page's <head> section.",
    },
    {
      question: "How long should my title tag and meta description be?",
      answer: "Title tag: 50-60 characters before Google truncates. Meta description: 150-160 characters. The generator counts both live so you stay inside the limits.",
    },
    {
      question: "Do meta tags still affect SEO rankings in 2026?",
      answer: "Title tags are a direct ranking signal. Meta descriptions influence click-through rate rather than rankings — but CTR decides how much traffic a ranking earns, and search engines echo these fields when citing your page.",
    },
    {
      question: "What are Open Graph tags and do I need them?",
      answer: "Open Graph tags control how your page looks when shared on Facebook, LinkedIn, WhatsApp, and most chat apps — the image, title, and description in the preview card. Without them, platforms guess, and previews often look broken.",
    },
    {
      question: "Is this meta tag generator really free?",
      answer: "Yes — free, no sign-up, no watermarks, no limits. It runs entirely in your browser, so your titles and URLs are never sent to a server.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const generatedTags = [
  { icon: Type, title: "Title Tag", desc: "The clickable headline in Google results and a direct ranking signal. 50-60 characters, keyword first." },
  { icon: FileText, title: "Meta Description", desc: "The pitch under the title. 150-160 characters that decide whether searchers click you or a competitor." },
  { icon: Share2, title: "Open Graph Tags", desc: "Control the preview card on Facebook, LinkedIn, WhatsApp, Slack, and Discord — image, title, description." },
  { icon: AtSign, title: "Twitter / X Card", desc: "The large-image card when your link is shared on X. Falls back to Open Graph where missing." },
  { icon: LinkIcon, title: "Canonical URL", desc: "Tells search engines the master version of the page, preventing duplicate-content dilution." },
  { icon: Smartphone, title: "Viewport & Charset", desc: "The technical pair every page needs for correct mobile rendering and text encoding." },
];

const pasteTargets = [
  { platform: "Plain HTML", how: "Paste inside <head> … </head>, before any scripts." },
  { platform: "WordPress", how: "Use a header plugin or your SEO plugin's per-page fields (Yoast/Rank Math fill these tags for you)." },
  { platform: "Next.js / React", how: "Use the Metadata API (App Router) or a Head component — mirror the generated fields." },
  { platform: "Shopify / Wix / Squarespace", how: "Each has an SEO section per page — paste title and description; social tags are usually automatic." },
];

export default function MetaTagGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free SEO Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Meta Tag Generator for SEO & Social
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Generate every meta tag your page needs — title tag, meta description, Open Graph,
          Twitter card, and canonical URL — with live Google and social previews. Copy clean,
          paste-ready HTML in seconds.
        </p>
      </div>

      <MetaTagGeneratorTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Generate Meta Tags in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Enter your page details", detail: "Title, description, URL, and an image for social cards. The character counters keep you inside Google's display limits." },
            { step: "Check the live previews", detail: "See exactly how your page will look in Google results and social share cards before anything goes live." },
            { step: "Copy the HTML into your <head>", detail: "One click copies the complete, clean markup — paste it into your site's head section and republish." },
          ].map((item, i) => (
            <li key={item.step} className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card">
              <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary font-extrabold text-sm">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base">{item.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Tags generated */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Every Tag This Generator Creates</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            The complete meta tag set for Google, Facebook, LinkedIn, X, and every chat app that unfurls links.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {generatedTags.map((tag) => (
            <div key={tag.title} className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <tag.icon size={18} className="text-primary" />
                </span>
                <h3 className="font-bold text-sm sm:text-base">{tag.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{tag.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Length cheat sheet */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Meta Tag Length Limits (2026 Cheat Sheet)</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
          Search engines and social platforms each truncate at different points — these are the safe ranges the generator enforces:
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold">Tag</th>
                <th className="p-3.5 font-bold">Safe length</th>
                <th className="p-3.5 font-bold">Note</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">Title tag</td><td className="p-3.5">50–60 chars</td><td className="p-3.5">Ranking signal — keyword first</td></tr>
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">Meta description</td><td className="p-3.5">150–160 chars</td><td className="p-3.5">CTR lever, echoed by AI search</td></tr>
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">OG title</td><td className="p-3.5">≤ 60 chars</td><td className="p-3.5">Wraps at ~2 lines in cards</td></tr>
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">OG description</td><td className="p-3.5">≤ 110 chars</td><td className="p-3.5">Hidden on some platforms</td></tr>
              <tr><td className="p-3.5 font-semibold text-foreground">OG image</td><td className="p-3.5">1200 × 630 px</td><td className="p-3.5">1.91:1 ratio, under 1 MB</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Where to paste */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Where to Paste the Generated Tags</h2>
        <div className="grid gap-4">
          {pasteTargets.map((t) => (
            <div key={t.platform} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Code2 size={15} className="text-primary shrink-0" /> {t.platform}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{t.how}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Frequently Asked Questions</h2>
        <div className="grid gap-4">
          {toolConfig.faqs.map((faq) => (
            <div key={faq.question} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base mb-1.5">{faq.question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Keep Optimizing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/seo-title-analyzer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> SEO Title Checker — score the title before you tag it</Link></li>
              <li><Link href="/tools/og-preview" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> OG Preview — test how links unfurl</Link></li>
              <li><Link href="/tools/schema-markup-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Schema Markup Generator — JSON-LD structured data</Link></li>
              <li><Link href="/tools/robots-txt-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Robots.txt Generator — crawler rules</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/seo-meta-tags-generator-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> SEO Meta Tags: Complete Guide with Examples</Link></li>
              <li><Link href="/blog/how-to-write-seo-titles-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Write SEO Titles That Get Clicks</Link></li>
              <li><Link href="/blog/blog-seo-checklist-before-publishing-in-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Blog SEO Checklist Before Publishing</Link></li>
              <li><Link href="/blog/how-to-rank-in-ai-search-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Rank in AI Search (GEO Guide)</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
