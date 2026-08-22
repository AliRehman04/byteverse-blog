import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, Newspaper, ListChecks, Star, MapPin, User, Building2, FileCode, Search } from "lucide-react";
import { SchemaMarkupGeneratorTool } from "./schema-markup-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Schema Markup Generator",
  title: "Schema Markup Generator (JSON-LD) - Free & Valid",
  description: "Free schema markup generator (JSON-LD): build Article, FAQ, HowTo, Product, LocalBusiness, Breadcrumb, Person, and Organization structured data visually.",
  slug: "schema-markup-generator",
  keywords: [
    "schema markup generator",
    "schema markup generator (json-ld)",
    "json-ld generator",
    "json ld schema generator",
    "structured data generator",
    "schema generator",
    "free schema markup generator",
    "google schema markup generator",
    "structured data markup generator",
    "json-ld code generator",
    "schema markup generator for website",
    "faq schema generator",
    "article schema generator",
    "product schema generator",
    "rich snippets",
  ],
  featureList: [
    "8 schema types: Article, FAQ, HowTo, Product, LocalBusiness, Breadcrumb, Person, Organization",
    "Valid JSON-LD output (Google's recommended format)",
    "Visual form builder — no code knowledge needed",
    "Copy-ready script tag",
    "Runs fully in your browser",
  ],
  faqs: [
    {
      question: "What is schema markup and what does it do?",
      answer: "Schema markup (structured data) is code that describes your page's meaning to search engines — this is an article, written by this person, on this date. It powers rich results like star ratings, breadcrumbs, and FAQ snippets, and helps AI search engines understand and cite your content.",
    },
    {
      question: "Should I use JSON-LD or Microdata?",
      answer: "JSON-LD — it is Google's explicitly recommended format and what this tool generates. It lives in one script tag instead of being woven through your HTML, making it far easier to add, maintain, and debug.",
    },
    {
      question: "How do I add the generated schema to my website?",
      answer: "Copy the generated script tag and paste it into your page's <head> (or anywhere in the HTML). WordPress users can paste via an SEO plugin's custom-schema field; Next.js and other frameworks can inject it in the page head or layout.",
    },
    {
      question: "How do I test my schema markup?",
      answer: "Paste your page URL or the code into Google's Rich Results Test (search.google.com/test/rich-results) for eligibility, and validator.schema.org for pure syntax validation. Both are free.",
    },
    {
      question: "Does schema markup improve rankings?",
      answer: "Not directly — Google says structured data is not a ranking factor. But it enables rich results that raise click-through rate, helps search engines disambiguate your content, and increases the odds AI answer engines quote your page accurately.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const schemaTypes = [
  { icon: Newspaper, title: "Article", desc: "Blog posts and news — headline, author, dates. The baseline for every content site." },
  { icon: ListChecks, title: "FAQPage", desc: "Q&A blocks. Rich-result display is limited to authoritative sites since 2023, but the markup still aids understanding and AI citation." },
  { icon: FileCode, title: "HowTo", desc: "Step-by-step instructions with tools and time — ideal for tutorials." },
  { icon: Star, title: "Product", desc: "Price, availability, and ratings — powers the shopping-style rich results." },
  { icon: MapPin, title: "LocalBusiness", desc: "Address, hours, and contact info — essential for local SEO and map packs." },
  { icon: ArrowRight, title: "BreadcrumbList", desc: "The clickable path shown in Google results instead of a raw URL." },
  { icon: User, title: "Person", desc: "Author and profile pages — strengthens E-E-A-T signals across your site." },
  { icon: Building2, title: "Organization", desc: "Company name, logo, and socials — feeds Google's knowledge panel." },
];

export default function SchemaMarkupGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free SEO Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Schema Markup Generator (JSON-LD)</h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Build valid JSON-LD structured data visually — Article, FAQ, HowTo, Product, LocalBusiness,
          Breadcrumb, Person, and Organization. Fill the form, copy the script tag, paste it in your
          page. No code knowledge required.
        </p>
      </div>

      <SchemaMarkupGeneratorTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Generate Schema Markup in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Choose a schema type", detail: "Article for posts, Product for listings, LocalBusiness for shops — pick what matches the page's main content." },
            { step: "Fill in the fields", detail: "The form maps every required and recommended property — no need to memorize schema.org documentation." },
            { step: "Copy, paste, validate", detail: "Copy the script tag into your page's head, then confirm eligibility with Google's Rich Results Test." },
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

      {/* Schema types */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">8 Schema Types You Can Generate</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Each type unlocks a different search feature — pick by what the page actually is.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {schemaTypes.map((type) => (
            <div key={type.title} className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <type.icon size={18} className="text-primary" />
                </span>
                <h3 className="font-bold text-sm sm:text-base">{type.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{type.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Validate */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Validate Before You Ship</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
          Broken schema is worse than none — always run generated markup through both free validators:
        </p>
        <div className="grid gap-4">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2"><Search size={15} className="text-primary shrink-0" /> Google Rich Results Test</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">Checks whether the page is <em>eligible for rich results</em> — the test that matters for search appearance. Test by URL after deploying or by pasting the code directly.</p>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2"><FileCode size={15} className="text-primary shrink-0" /> Schema.org Validator</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">Pure syntax and vocabulary validation against the schema.org standard — catches structural errors the Google test glosses over.</p>
          </div>
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
              <li><Link href="/tools/meta-tag-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Meta Tag Generator — titles, descriptions & social tags</Link></li>
              <li><Link href="/tools/seo-title-analyzer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> SEO Title Checker — score your headlines</Link></li>
              <li><Link href="/tools/robots-txt-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Robots.txt Generator — crawler rules</Link></li>
              <li><Link href="/tools/og-preview" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> OG Preview — social card testing</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/seo-meta-tags-generator-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> SEO Meta Tags: Complete Guide</Link></li>
              <li><Link href="/blog/how-to-rank-in-ai-search-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Rank in AI Search (GEO Guide)</Link></li>
              <li><Link href="/blog/blog-seo-checklist-before-publishing-in-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Blog SEO Checklist Before Publishing</Link></li>
              <li><Link href="/blog/free-seo-audit-website-2026-step-by-step" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Free SEO Audit: Step by Step</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
