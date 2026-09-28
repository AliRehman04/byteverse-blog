import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, BookOpen, Monitor, Ruler, ShieldCheck, Sparkles } from "lucide-react";
import { SeoTitleAnalyzerTool } from "./seo-title-analyzer-tool";
import { ToolJsonLd, generateToolMetadata } from "@/lib/tool-seo";

const toolConfig = {
  name: "SEO Title Checker",
  title: "SEO Title Checker: Length, Pixels & SERP Preview",
  description:
    "Free SEO title checker with character counts, estimated pixel width, desktop/mobile SERP previews, brand suffixes and draft comparison. No sign-up.",
  slug: "seo-title-analyzer",
  keywords: [
    "seo title checker",
    "seo title length checker",
    "title length checker",
    "serp preview tool",
    "title and meta description checker",
    "title tag pixel width",
  ],
  applicationCategory: "BusinessApplication",
  audience: "Bloggers, editors, developers and website owners",
  featureList: [
    "Unicode-aware character counts including brand suffixes",
    "Approximate title pixel width using the browser's Arial font",
    "Responsive desktop and mobile search-result mockups",
    "Literal target-phrase and repeated-word checks",
    "Compare up to three drafts in this tab",
    "Copy the full title or escaped HTML title element",
  ],
  faqs: [
    {
      question: "How do I check my SEO title length online?",
      answer: "Paste your main title, optionally add a brand suffix, then review the full character count, approximate pixel width and desktop/mobile previews. You can compare three drafts and copy the chosen title. No account or payment is required.",
    },
    {
      question: "Does Google have a 60-character title limit?",
      answer: "No. Google's documentation says there is no fixed length limit for a title element; the displayed title link is truncated as needed to fit device width. A character target is an editing guideline, not a guarantee. Keep the topic clear and check the full title, including any brand suffix.",
    },
    {
      question: "Why measure pixel width as well as characters?",
      answer: "Letters have different widths: W takes more space than i in the same proportional font. This tool measures the title at 20px Arial using your browser, then fits it to the visible preview. Fonts, device sizes and Google's layouts vary, so these are estimates rather than exact Google measurements.",
    },
    {
      question: "Can this checker get the title from a website URL?",
      answer: "No. The URL field only changes the mockup's address; it does not fetch a page or inspect its metadata. Paste the title from your CMS or page source. This keeps title analysis local and avoids sending draft text or URLs to an analysis service.",
    },
    {
      question: "Will a title that fits this preview rank higher or get more clicks?",
      answer: "Not necessarily. Preview fit is a layout observation, not an SEO score. Google can generate a different title or snippet from the page and other signals. Write an accurate title, improve the page behind it, and evaluate actual queries, impressions, position and clicks in Search Console after publishing.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const examples = [
  { type: "Tutorial", before: "Image Tips and Tricks", after: "How to Compress a JPG to Under 100KB", why: "Names a task and a constraint. Only use this promise when the page actually explains how to meet it." },
  { type: "Product", before: "The Everyday Collection", after: "Canvas Tote Bag with Zip & Inside Pocket", why: "Describes the item and distinguishing features instead of relying on a collection name alone." },
  { type: "Comparison", before: "JSON YAML Guide", after: "JSON vs YAML: Syntax, Comments & Use Cases", why: "Makes the comparison explicit and previews the criteria the article covers." },
  { type: "Utility", before: "SEO Title Checker | Title Checker | Check SEO Title", after: "SEO Title Checker: Length, Pixels & Preview", why: "Uses the topic once, then describes the useful outputs. Repeating variations is not extra value." },
];

export default function SeoTitleAnalyzerPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <ToolJsonLd config={toolConfig} />
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">Home</Link><ChevronRight size={12} aria-hidden="true" />
        <Link href="/tools" className="hover:text-primary">Tools</Link><ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page">SEO Title Checker</span>
      </nav>
      <header className="relative mb-9 overflow-hidden rounded-3xl border border-primary/15 bg-linear-to-br from-blue-50 via-background to-violet-50 px-6 py-9 dark:from-blue-950/30 dark:via-background dark:to-violet-950/20 sm:px-10">
        <div className="pointer-events-none absolute -right-8 -top-16 size-56 rounded-full border-30 border-primary/5" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary"><Sparkles size={13} aria-hidden="true" />Measure first. Publish with context.</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">SEO title checker<span className="mt-2 block text-2xl font-medium text-muted-foreground sm:text-3xl">A clearer title starts here.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Check title length, estimate pixel width and preview your search snippet. Include your brand, compare a few drafts and keep the version that accurately describes your page—not the one with a made-up SEO score.</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5"><Ruler size={14} className="text-primary" aria-hidden="true" />Characters + pixels</span>
            <span className="inline-flex items-center gap-1.5"><Monitor size={14} className="text-primary" aria-hidden="true" />Desktop + mobile</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary" aria-hidden="true" />Free · No sign-up</span>
          </div>
        </div>
      </header>
      <SeoTitleAnalyzerTool />
      <nav aria-label="Title checker guide" className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-3 border-y border-border py-4 text-sm text-muted-foreground">
        <a href="#how-to-check" className="hover:text-primary">How to use</a><a href="#title-length" className="hover:text-primary">Length &amp; pixels</a><a href="#title-examples" className="hover:text-primary">Title examples</a><a href="#title-method" className="hover:text-primary">Method &amp; limits</a><a href="#title-faq" className="hover:text-primary">FAQs</a>
      </nav>

      <section id="how-to-check" className="mt-14 scroll-mt-24">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">From draft to decision</p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How to check an SEO title in three steps</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: "Paste the actual title", text: "Use the text from your CMS title field, without HTML. Add a brand only if it is appended on the live page. An optional target phrase checks literal wording; it does not discover keywords for you." },
            { title: "Preview the full result", text: "Switch between desktop and mobile. Notice what disappears when space is tighter. Include a description if helpful, but remember Google can choose a different snippet from your content." },
            { title: "Compare, then verify", text: "Save up to three drafts. Compare the promise, repetition and measured width—not just the shortest title. Copy the chosen text, then check that your CMS has not added the brand a second time." },
          ].map((item, i) => (
            <li key={item.title} className="rounded-2xl border border-border bg-card p-5"><span className="text-sm font-bold text-primary">0{i + 1}</span><h3 className="mt-3 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p></li>
          ))}
        </ol>
      </section>

      <section id="title-length" className="mt-14 grid scroll-mt-24 items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Title length: characters count text, pixels explain fit</h2>
          <p>A 60-character title is not automatically safe, and a 61-character title is not automatically bad. <a href="https://developers.google.com/search/docs/appearance/title-link" className="text-primary underline underline-offset-4">Google&apos;s title-link guidance</a> says there is no fixed title-element length limit. Displayed title links are shortened to fit the available space. That space depends on the device and result layout.</p>
          <p>Wide letters, capitals, punctuation and your brand all use space. Ten capital Ws and ten lowercase is have the same character count but very different widths. The checker measures the complete title in your browser using 20px Arial. It counts the separator and brand, then wraps or clips at the visible preview width. The displayed pixel value is the full, unwrapped width in CSS pixels.</p>
          <p>Our desktop model uses one line up to 580px; the mobile model uses two lines up to 360px. On a smaller screen, the preview uses the space actually available. These are transparent simulation choices, not permanent Google specifications. A title that fits still needs to make sense and match the page. Do not cut an important product attribute just to get a fit label.</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Same count. Different footprint.</p>
          <div className="mt-5 space-y-5" style={{ fontFamily: "Arial, sans-serif" }}><div><p className="text-xl text-primary">WWWWWWWWWW</p><p className="mt-1 text-xs text-muted-foreground">10 wider characters</p></div><div><p className="text-xl text-primary">iiiiiiiiii</p><p className="mt-1 text-xs text-muted-foreground">10 narrower characters</p></div></div>
          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">Useful question: “Can a reader see the page&apos;s main promise?” Not: “Did I hit exactly 60 characters?”</p>
        </div>
      </section>

      <section id="title-examples" className="mt-14 scroll-mt-24">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Title examples: make the purpose visible</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">These are illustrative edits, not measured CTR winners. Each version states a useful distinction without adding an unsupported year, statistic or superlative. For more writing patterns, use our <Link href="/blog/how-to-write-seo-titles-2026" className="text-primary underline underline-offset-4">SEO title-writing guide</Link>, and check its advice against the current Google guidance linked here.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">{examples.map(example => <article key={example.type} className="rounded-2xl border border-border bg-card p-5"><p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{example.type}</p><p className="mt-3 text-sm text-muted-foreground"><span className="font-medium">Before:</span> {example.before}</p><p className="mt-2 flex items-start gap-2 text-sm font-semibold"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /><span>{example.after}</span></p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{example.why}</p></article>)}</div>
      </section>

      <section id="title-method" className="mt-14 scroll-mt-24 rounded-2xl border border-border bg-muted/30 p-5 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight">What this checker measures—and what it cannot know</h2>
        <div className="mt-5 grid gap-6 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
          <div className="space-y-4"><p><strong className="text-foreground">Character and word counts.</strong> Modern browsers count visible character clusters, so a combined emoji or an accented character is not counted like multiple unrelated letters. Older browsers fall back to Unicode code points. The main-title word count groups letters and numbers; it is not a language-specific tokenizer or an ideal SEO word target.</p><p><strong className="text-foreground">Literal phrase and repetition checks.</strong> A phrase match ignores case but is not keyword research, semantic matching or intent analysis. A synonym can be valid even when no literal match appears. The repetition check flags words of at least three characters used three or more times, excluding a small list of common English words. Review the warning; do not automatically remove needed terminology.</p></div>
          <div className="space-y-4"><p><strong className="text-foreground">A layout estimate, not a prediction.</strong> Font rendering, Google experiments, device width and rewriting can change the real result. There is no live SERP lookup, URL crawl, ranking score, search-volume data or automated A/B test here. Draft comparison is only a side-by-side writing aid.</p><p><strong className="text-foreground">Local inputs, no hidden analysis request.</strong> This checker processes title text in this tab and does not send the title or display URL to an AI or analysis server. Saved comparison drafts disappear on reload. Site-wide analytics and other services are described in our <Link href="/privacy" className="text-primary underline underline-offset-4">privacy policy</Link>; avoid pasting confidential material into public tools.</p></div>
        </div>
      </section>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Match the page, not a checklist of power words</h2>
          <p>Start with the task. A tutorial should describe what someone will learn; a product title should identify the item; a comparison should identify the options and useful criteria. Adding “best,” “free” or the current year is not a universal improvement. Use those words only when the page supports the claim.</p>
          <p>Keep the title&apos;s promise consistent with the visible H1 and body content. A concise title that promises a downloadable file is misleading if the tool only previews it. Our <Link href="/blog/how-to-write-seo-friendly-blog-posts-2026" className="text-primary underline underline-offset-4">SEO-friendly writing guide</Link> puts titles into the wider content workflow. For a dense sentence rather than a layout issue, use the <Link href="/tools/readability-checker" className="text-primary underline underline-offset-4">readability checker</Link> as another editing aid, not a quality verdict.</p>
        </section>
        <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Why Google may show a different title</h2>
          <p>Google creates title links automatically. Its sources can include the title element, prominent headings, other page text and links pointing to the page. An outdated date, vague title, repeated brand or a mismatch with the main heading can give it reasons to choose different wording. Fitting our preview does not override that process.</p>
          <p>The description is separate: <a href="https://developers.google.com/search/docs/appearance/snippet" className="text-primary underline underline-offset-4">Google&apos;s snippet documentation</a> explains that page content is the primary source, though a meta description may be used when it is more helpful. Use the <Link href="/tools/meta-tag-generator" className="text-primary underline underline-offset-4">meta tag generator</Link> to assemble your chosen metadata and <Link href="/tools/og-preview" className="text-primary underline underline-offset-4">Open Graph Preview</Link> for a separate social-card mockup.</p>
        </section>
      </div>

      <section className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight">After editing: publish carefully, measure honestly</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Copy the full title into your CMS&apos;s SEO title field. If your CMS adds the brand automatically, paste only the main title there. Use “Copy title HTML” only when editing raw HTML; its escaped entities belong inside the title element, not in a plain-text CMS field. Inspect the final page source to confirm there is one intended title. The <Link href="/blog/seo-meta-tags-generator-guide-2026" className="text-primary underline underline-offset-4">meta tags guide</Link> explains how the surrounding fields fit together.</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Before release, check the page itself, internal links and indexing settings with our <Link href="/blog/blog-seo-checklist-before-publishing-in-2026" className="text-primary underline underline-offset-4">pre-publish SEO checklist</Link>. Afterwards, compare Search Console queries, impressions, position and clicks over comparable date ranges. Account for changing query mix and devices; a small number of clicks is not a reliable A/B result. Google needs to recrawl and reprocess changed pages, and neither a new title nor this tool guarantees a traffic increase.</p>
      </section>

      <section id="title-faq" className="mx-auto mt-14 max-w-4xl scroll-mt-24">
        <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">SEO title checker FAQs</h2>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">{toolConfig.faqs.map(faq => <div key={faq.question} className="p-5 sm:p-6"><h3 className="font-semibold">{faq.question}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p></div>)}</div>
      </section>

      <section className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl"><p className="flex items-center gap-2 font-semibold text-foreground"><BookOpen size={14} aria-hidden="true" />Method reviewed 28 September 2026</p><p className="mt-2 leading-relaxed">Based on Google Search Central&apos;s <a href="https://developers.google.com/search/docs/appearance/title-link" className="text-primary underline">title-link</a> and <a href="https://developers.google.com/search/docs/appearance/snippet" className="text-primary underline">snippet guidance</a>. Measurements use the documented preview assumptions above. No invented reviews, traffic benchmarks or guaranteed scores.</p></div>
        <a href="#title-workspace" className="inline-flex min-h-10 shrink-0 items-center gap-2 font-semibold text-primary">Back to the checker <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
    </div>
  );
}