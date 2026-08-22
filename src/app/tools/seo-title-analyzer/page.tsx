import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Ruler, Type, Target, Hash, AlertTriangle, Eye, Wrench, BookOpen } from "lucide-react";
import { SeoTitleAnalyzerTool } from "./seo-title-analyzer-tool";
import { ToolJsonLd, generateToolMetadata } from "@/lib/tool-seo";

const toolConfig = {
  name: "SEO Title Checker",
  title: "SEO Title Checker - Free Title & Headline Analyzer",
  description:
    "Check SEO titles free online: score length, word count, intent words, specificity, and click potential. Instant title check — no login, no limits.",
  slug: "seo-title-analyzer",
  keywords: [
    "seo title checker",
    "seo title check",
    "title checker",
    "seo title checker free online",
    "seo title tester",
    "seo title length checker",
    "seo headline checker",
    "headline checker",
    "headline analyzer",
    "free headline analyzer",
    "seo title analyzer",
    "blog title checker",
    "title analyzer",
    "seo title preview",
    "title optimizer tool",
    "seo title score",
    "seo article title checker",
  ],
  featureList: [
    "Instant title score",
    "Length and word count check",
    "Search intent word detection",
    "Specificity and number signals",
    "Keyword stuffing warning",
  ],
  faqs: [
    {
      question: "How do I check my SEO title for free?",
      answer: "Paste your title into the checker above. It instantly scores length, word count, intent words, specificity, and keyword stuffing risk — no login, no limits, free online.",
    },
    {
      question: "How long should an SEO title be?",
      answer: "A practical target is 45 to 65 characters. Google truncates most desktop titles around 60 characters, and mobile shows slightly more — the checker flags titles outside the safe range.",
    },
    {
      question: "What is the difference between a title checker and a headline analyzer?",
      answer: "They are the same category of tool. A title checker focuses on search result limits (length, truncation), while a headline analyzer scores click psychology (intent words, specificity). This tool does both in one pass.",
    },
    {
      question: "Does my title tag affect Google rankings?",
      answer: "Yes — the title tag is a direct, confirmed ranking signal, and it also controls click-through rate. A clearer title can lift traffic on an already-ranking page without changing the article.",
    },
    {
      question: "Can I use this for YouTube titles or book titles?",
      answer: "Yes. Length limits differ (YouTube shows about 70 characters), but the scoring principles — specificity, intent words, curiosity without clickbait — apply to YouTube videos, books, and newsletters alike.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const scoreChecks = [
  { icon: Ruler, title: "Length & Truncation", desc: "Character count against Google's desktop and mobile display limits, so your title never gets cut mid-promise." },
  { icon: Type, title: "Word Count & Clarity", desc: "6-11 words is the readability sweet spot. Too short reads vague, too long gets skimmed past." },
  { icon: Target, title: "Search Intent Words", desc: "Detects intent markers — best, how, guide, review, checklist, vs — that match what searchers actually type." },
  { icon: Hash, title: "Specificity Signals", desc: "Numbers, years, and concrete details lift click-through rate. Vague titles lose to specific ones." },
  { icon: AlertTriangle, title: "Keyword Stuffing Risk", desc: "Flags repeated keywords that read spammy to users and to Google's title rewrite system." },
  { icon: Eye, title: "Click Potential", desc: "An overall score combining every factor — aim for green before you publish." },
];

const titleMistakes = [
  { mistake: "Front-loading the brand", fix: "Put the keyword promise first, brand last — searchers scan the first 3 words." },
  { mistake: "Titles over 65 characters", fix: "Google truncates or rewrites them; keep the full promise visible." },
  { mistake: "No number, no year, no specifics", fix: "\u201C7 Ways\u2026 in 2026\u201D beats \u201CSome Ways\u201D in every CTR study." },
  { mistake: "Clickbait that under-delivers", fix: "High clicks with instant bounces teach Google to demote the page." },
  { mistake: "Same keyword twice", fix: "Repetition wastes characters and triggers rewrite — use a synonym or benefit instead." },
];

export default function SeoTitleAnalyzerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free SEO Tool · No Sign-up</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">SEO Title Checker & Headline Analyzer</h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Check your SEO title free online before you publish. Instant score for length, word count,
          search intent, specificity, and click potential — the same checks that decide whether a
          ranking page actually earns the click.
        </p>
      </div>

      <SeoTitleAnalyzerTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Check Your SEO Title in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Paste or type your title", detail: "Drop in a draft title — blog post, product page, video, or newsletter subject." },
            { step: "Read the instant score", detail: "Length, word count, intent words, specificity, and stuffing risk are scored in real time as you type." },
            { step: "Fix the red flags and re-check", detail: "Tighten length, add a number or year, front-load the keyword — watch the score turn green, then publish." },
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

      {/* What it scores */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">What This SEO Title Checker Scores</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Six checks, each backed by how Google actually displays and rewrites titles in 2026.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {scoreChecks.map((check) => (
            <div key={check.title} className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <check.icon size={18} className="text-primary" />
                </span>
                <h3 className="font-bold text-sm sm:text-base">{check.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{check.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Length rules */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">SEO Title Length: The 2026 Rules</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
          Google measures titles in pixels, not characters — but character counts are the practical
          proxy every SEO uses. The safe ranges by placement:
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold">Placement</th>
                <th className="p-3.5 font-bold">Safe length</th>
                <th className="p-3.5 font-bold">What happens beyond it</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">Google desktop</td><td className="p-3.5">50–60 chars</td><td className="p-3.5">Truncated with … or rewritten</td></tr>
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">Google mobile</td><td className="p-3.5">up to ~65 chars</td><td className="p-3.5">Slightly more room, still truncates</td></tr>
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">YouTube</td><td className="p-3.5">~70 chars</td><td className="p-3.5">Cut in suggested-video sidebars</td></tr>
              <tr><td className="p-3.5 font-semibold text-foreground">Email subject</td><td className="p-3.5">30–50 chars</td><td className="p-3.5">Clipped on mobile inboxes</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Mistakes */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">5 Title Mistakes This Checker Catches</h2>
        <div className="grid gap-4">
          {titleMistakes.map((m) => (
            <div key={m.mistake} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500 shrink-0" /> {m.mistake}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{m.fix}</p>
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
              <li><Link href="/tools/meta-tag-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Meta Tag Generator — title + description + social tags</Link></li>
              <li><Link href="/tools/og-preview" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> OG Preview — see your title in social cards</Link></li>
              <li><Link href="/tools/slug-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Slug Generator — clean URLs from titles</Link></li>
              <li><Link href="/tools/word-counter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Word Counter — for the article behind the title</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/how-to-write-seo-titles-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Write SEO Titles That Get Clicks</Link></li>
              <li><Link href="/blog/blog-seo-checklist-before-publishing-in-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Blog SEO Checklist Before Publishing</Link></li>
              <li><Link href="/blog/how-to-write-seo-friendly-blog-posts-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Write SEO-Friendly Blog Posts</Link></li>
              <li><Link href="/blog/seo-meta-tags-generator-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> SEO Meta Tags: Complete Guide</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}