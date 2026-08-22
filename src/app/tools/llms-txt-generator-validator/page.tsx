import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, CheckCircle2, AlertTriangle } from "lucide-react";
import { LlmsTxtTool } from "./llms-txt-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "llms.txt Generator & Validator",
  title: "LLMs.txt Generator & Validator - Free Checker Online",
  description: "Generate a spec-compliant llms.txt file or validate an existing one — free online checker with format rules, live example, and AI SEO guidance.",
  slug: "llms-txt-generator-validator",
  keywords: [
    "llms.txt generator",
    "llms.txt validator",
    "llms.txt checker",
    "llms txt generator free",
    "llms txt generator online",
    "llms.txt file generator",
    "llms.txt example",
    "llms.txt format",
    "llms.txt what is it",
    "llms.txt seo",
    "llms.txt google",
    "ai website optimization",
  ],
  featureList: [
    "Spec-compliant llms.txt generation",
    "Paste-and-validate existing files",
    "Format issue detection with fixes",
    "Markdown structure rules built in",
    "Runs fully in your browser",
  ],
  faqs: [
    {
      question: "What is llms.txt and what does it do?",
      answer: "llms.txt is a proposed standard — a markdown file at your site root that gives AI models a concise, curated map of your most important pages. Think robots.txt's cousin: robots.txt controls crawler access, llms.txt describes what matters.",
    },
    {
      question: "How do I check if my llms.txt file is valid?",
      answer: "Paste it into the validator above — it checks the H1 title requirement, blockquote summary, H2 section structure, list formatting, and link syntax, and flags every issue with a fix.",
    },
    {
      question: "Does Google use llms.txt?",
      answer: "No — Google has said it does not use llms.txt, and no major AI provider has officially committed to it. Some AI crawlers fetch it anyway. Honest advice: it costs five minutes and may help emerging AI tools understand your site, but do not expect ranking effects.",
    },
    {
      question: "Does llms.txt affect SEO?",
      answer: "Not traditional rankings. It belongs to the AI-visibility toolkit — alongside clean structure, schema markup, and crawlable content — aimed at how AI assistants summarize and cite your site rather than how Google ranks it.",
    },
    {
      question: "Can I have both robots.txt and llms.txt?",
      answer: "Yes, and you should — they do different jobs. robots.txt controls which crawlers may access which paths; llms.txt offers AI models a curated content overview. They live side by side at your domain root.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const formatRules = [
  { rule: "Start with one H1 title", detail: "# Your Site Name — required, exactly one." },
  { rule: "Optional blockquote summary", detail: "> One or two lines describing the site, right after the H1." },
  { rule: "H2 sections for categories", detail: "## Docs, ## Blog, ## Tools — group related links." },
  { rule: "Lists only inside sections", detail: "Each H2 contains list items with markdown links, not paragraphs." },
  { rule: "Markdown links with context", detail: "[Page title](url): one-line description of what's there." },
  { rule: "No sensitive data", detail: "Skip emails, phone numbers, and anything you would not want quoted by an AI." },
];

export default function LlmsTxtPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free AI SEO Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          LLMs.txt Generator & Validator
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Create a spec-compliant llms.txt file for your website, or paste an existing one into the
          checker to validate its format — H1 title, sections, links, and structure — with every
          issue flagged and explained. Free, online, in your browser.
        </p>
      </div>

      <LlmsTxtTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Generate or Validate in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Generate: describe your site", detail: "Enter your site name, summary, and key page groups — the tool builds a correctly structured file." },
            { step: "Validate: paste any llms.txt", detail: "The checker verifies the H1 rule, blockquote, H2 sections, list-only content, and link syntax — with fixes for each issue." },
            { step: "Upload to your site root", detail: "Save as llms.txt at https://yourdomain.com/llms.txt (or /.well-known/llms.txt) and it is live for any AI crawler that looks." },
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

      {/* What is + example */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">What Is llms.txt?</h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                llms.txt is a proposed standard (by Jeremy Howard, 2024) — a markdown file at your
                site root that hands AI models a curated map of your most important content. Where
                robots.txt says <em>where crawlers may go</em>, llms.txt says <em>what actually matters here</em>.
              </p>
              <p>
                The logic: AI assistants have limited context windows and messy HTML to parse. A
                clean, human-curated index helps them summarize your site accurately and — the hope —
                cite the right pages when users ask questions your content answers. It is one small
                piece of the wider <Link href="/blog/how-to-rank-in-ai-search-2026" className="text-primary hover:underline">generative engine optimization playbook</Link>.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/50"><h3 className="font-bold text-sm">Example llms.txt</h3></div>
            <pre className="p-5 text-xs sm:text-sm font-mono text-muted-foreground overflow-x-auto">{`# ByteVerse

> Free AI & SEO tools plus tested
> tech guides for developers.

## Tools
- [SEO Title Checker](https://…): score titles
- [Meta Tag Generator](https://…): SEO tags

## Guides
- [Rank in AI Search](https://…): GEO guide
- [Local AI Setup](https://…): run LLMs offline`}</pre>
          </div>
        </div>
      </section>

      {/* Format rules */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">llms.txt Format Rules the Validator Checks</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Six rules make a file spec-compliant — break one and parsers may skip your content.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {formatRules.map((r) => (
            <div key={r.rule} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-1.5">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> {r.rule}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honest section */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Does Google Use llms.txt? (The Honest Answer)</h2>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            <AlertTriangle size={15} className="text-amber-500 inline mr-1.5 -mt-0.5" />
            No. Google has stated it does not use llms.txt, and as of 2026 no major AI provider has
            officially committed to reading it — though several AI crawlers fetch it in the wild.
            Treat it as a five-minute, zero-risk bet on an emerging convention, not a ranking tactic.
            The AI-visibility work with proven payoff is elsewhere: crawlable content, answer-first
            structure, <Link href="/tools/schema-markup-generator" className="text-primary hover:underline">schema markup</Link>, and the
            fundamentals in our <Link href="/blog/how-to-rank-in-ai-search-2026" className="text-primary hover:underline">AI search ranking guide</Link>.
            Do those first; add llms.txt after.
          </p>
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Complete Your AI-Visibility Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/robots-txt-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Robots.txt Generator — crawler access rules</Link></li>
              <li><Link href="/tools/schema-markup-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Schema Markup Generator — JSON-LD structured data</Link></li>
              <li><Link href="/tools/meta-tag-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Meta Tag Generator — titles and descriptions</Link></li>
              <li><Link href="/tools/seo-title-analyzer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> SEO Title Checker — score your headlines</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/how-to-rank-in-ai-search-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Rank in AI Search (GEO Guide)</Link></li>
              <li><Link href="/blog/best-ai-search-engines-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 7 Best AI Search Engines Compared</Link></li>
              <li><Link href="/blog/website-not-showing-on-google-fixes-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Website Not Showing on Google? 10 Fixes</Link></li>
              <li><Link href="/blog/free-seo-audit-website-2026-step-by-step" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Free SEO Audit: Step by Step</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
