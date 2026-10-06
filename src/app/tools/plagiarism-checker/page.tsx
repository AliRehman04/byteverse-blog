import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { PlagiarismTool } from "./plagiarism-tool";

const toolConfig = {
  name: "Text Similarity Checker",
  title: "Free Text Similarity Checker - Compare Sources",
  description:
    "Compare a draft with up to five supplied sources, review matching phrases and save a report. Free text similarity checker with on-device matching; no web scan.",
  slug: "plagiarism-checker",
  keywords: [
    "text similarity checker",
    "compare two texts for plagiarism",
    "compare multiple texts",
    "duplicate sentence checker",
  ],
  applicationCategory: "ProductivityApplication",
  audience: "Writers, editors and students reviewing source citations",
  featureList: [
    "Compare one draft with one to five supplied sources locally",
    "Consecutive normalized word matching with 4, 6, 8 or 12-word minimums",
    "Draft coverage, reverse source coverage and matching passage evidence",
    "Optional balanced-quotation and final reference-section exclusions",
    "Exact normalized whole-sentence repetition checking within one draft",
    "TXT reports with optional matched passages and review notes",
    "Manual Google search links after query preview and an explicit click",
  ],
  faqs: [
    {
      question: "Does a similarity percentage prove plagiarism?",
      answer:
        "No. It measures matching eligible words against only your supplied sources. Quotations and common wording can match legitimately. Zero coverage means no qualifying match under the current settings, not proof of originality. Review context and attribution, not just a percentage.",
    },
    {
      question: "Can I compare two texts or more than two?",
      answer:
        "Yes: one primary draft with one to five labeled sources. Each text is limited to 10,000 words and 60,000 UTF-16 characters. UTF-8 .txt and .md imports are limited to 256 KB. PDF, DOCX and URL imports are not supported.",
    },
    {
      question: "How is this different from a duplicate sentence checker?",
      answer:
        "Compare mode finds consecutive normalized word runs across supplied texts. Repeat mode groups exact whole normalized sentences within your draft, subject to the selected minimum word length. Neither mode detects AI writing, understands paraphrased ideas or produces an originality score.",
    },
    {
      question: "Do exclusions and review labels change the percentage?",
      answer:
        "Quotation and reference-section exclusions remove eligible words on both sides, so they can change coverage. They do not validate citations. Source filters and the Not reviewed, Citation checked, Common wording and Needs revision labels organize evidence without changing the percentage.",
    },
    {
      question: "Is it free, and what happens to my text?",
      answer:
        "Yes, with no account required and the stated limits. The tool does not upload text or save work automatically; reload clears the workspace. Manual searches send the previewed query to Google only if you follow the search link. Sitewide ads and analytics are separate.",
    },
  ],
};

const baseMetadata = generateToolMetadata(toolConfig);
const socialImage = {
  url: `/tools/${toolConfig.slug}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "ByteVerse Text Similarity Checker: a fictional draft and supplied source with a shared phrase highlighted, not a plagiarism verdict.",
};

export const metadata: Metadata = {
  ...baseMetadata,
  title: { absolute: toolConfig.title },
  openGraph: {
    ...baseMetadata.openGraph,
    title: toolConfig.title,
    images: [socialImage],
  },
  twitter: {
    ...baseMetadata.twitter,
    title: toolConfig.title,
    images: [socialImage],
  },
};

const guideLinkClassName = "font-medium text-[#173f38] underline decoration-emerald-700/35 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 dark:text-emerald-200 dark:decoration-emerald-300/40";

export default function PlagiarismCheckerPage() {
  return (
    <div className="sim-page">
      <ToolJsonLd config={toolConfig} />

      <nav aria-label="Breadcrumb" className="sim-breadcrumb mb-5 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href="/" className="inline-flex min-h-9 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/tools" className="inline-flex min-h-9 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">Tools</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-foreground">Text similarity checker</li>
        </ol>
      </nav>

      <header className="sim-hero grid gap-6 rounded-3xl border border-emerald-900/10 bg-[#faf9f6] p-6 dark:border-emerald-100/15 dark:bg-[#122823] sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)] lg:items-center">
        <div className="sim-hero-copy min-w-0">
          <p className="sim-eyebrow inline-flex rounded-full bg-emerald-100/80 px-3 py-1.5 text-xs font-medium text-[#173f38] dark:bg-emerald-300/10 dark:text-emerald-200">Free · No account · On-device matching</p>
          <h1 className="sim-hero-title mt-4 text-3xl font-semibold tracking-tight text-[#173f38] dark:text-emerald-50 sm:text-4xl">Text similarity checker</h1>
          <p className="mt-3 text-lg font-medium text-[#173f38] dark:text-emerald-100">Compare your writing with sources.</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            See shared phrases across a draft and up to five sources you supply. Inspect the evidence and check citations—not a plagiarism verdict or an internet scan.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="#similarity-workspace" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173f38] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#23584d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 dark:bg-emerald-200 dark:text-[#173f38] dark:hover:bg-emerald-100">
              Compare texts <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#similarity-method" className={`inline-flex min-h-11 items-center text-sm ${guideLinkClassName}`}>How matching works</a>
          </div>
        </div>
        <figure className="sim-hero-illustration min-w-0 rounded-2xl border border-emerald-900/10 bg-white/80 p-5 dark:border-emerald-100/15 dark:bg-emerald-950/40">
          <figcaption className="text-xs font-medium text-muted-foreground">Shared wording · Fictional illustration</figcaption>
          <dl className="mt-4 space-y-4 text-sm leading-relaxed">
            <div>
              <dt className="mb-1 text-xs font-semibold text-[#173f38] dark:text-emerald-200">Your draft</dt>
              <dd>Each weekday, <mark className="rounded bg-emerald-100 px-0.5 text-[#173f38] dark:bg-emerald-200/20 dark:text-emerald-100">the reading room opens before sunrise</mark>.</dd>
            </div>
            <div className="border-t border-emerald-900/10 pt-4 dark:border-emerald-100/15">
              <dt className="mb-1 text-xs font-semibold text-[#173f38] dark:text-emerald-200">Supplied source</dt>
              <dd>For early visitors, <mark className="rounded bg-emerald-100 px-0.5 text-[#173f38] dark:bg-emerald-200/20 dark:text-emerald-100">the reading room opens before sunrise</mark>.</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">A place to review, not a verdict.</p>
        </figure>
      </header>

      <div className="mt-6"><PlagiarismTool /></div>

      <nav aria-label="Text similarity guide" className="sim-guide-nav mt-6 flex flex-wrap gap-x-6 gap-y-1 border-b border-border pb-3 text-sm">
        <a href="#similarity-method" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Method & limits</a>
        <a href="#similarity-privacy" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Text & privacy</a>
        <a href="#similarity-faq" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>FAQs</a>
      </nav>

      <section aria-labelledby="similarity-start-heading" className="sim-steps mt-8">
        <h2 id="similarity-start-heading" className="text-xl font-semibold tracking-tight text-[#173f38] dark:text-emerald-100">A considered review in three steps</h2>
        <ol className="mt-5 grid gap-5 border-b border-border pb-7 md:grid-cols-3 md:gap-8">
          {([
            { title: "Add your material", text: "Paste a primary draft and label one to five sources. Only material you supply is compared." },
            { title: "Set the scope", text: "Choose a minimum phrase length and optional exclusions, or use Repeat mode for a single draft." },
            { title: "Read, then record", text: "Inspect shared wording in context, check attribution and save a report with the details you choose." },
          ]).map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span aria-hidden="true" className="pt-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">0{index + 1}</span>
              <div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        <section id="similarity-method" aria-labelledby="similarity-method-heading" className="sim-method scroll-mt-24">
          <h2 id="similarity-method-heading" className="text-2xl font-semibold tracking-tight text-[#173f38] dark:text-emerald-100">What the percentage measures</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>Matching finds consecutive Unicode letter-and-number word runs of at least <strong className="text-foreground">4, 6 (default), 8 or 12 words</strong>. Spaces and punctuation are ignored; internal curly apostrophes are normalized. Unicode NFKC normalization harmonizes compatible character forms. Case folding is optional; accents are retained.</p>
            <p>Main coverage counts the union of matched, eligible draft-word positions across sources. Each word counts once. Reverse coverage uses each source&apos;s eligible words as its denominator, so swapping draft and source can change the percentage. Source percentages are not additive.</p>
            <aside aria-label="Fictional coverage calculation" className="border-l-2 border-emerald-600 bg-emerald-50/60 py-3 pr-3 pl-4 text-[#173f38] dark:border-emerald-300 dark:bg-emerald-300/5 dark:text-emerald-100">
              <p className="font-semibold">A fictional calculation</p>
              <p className="mt-1">12 matched words out of 40 eligible draft words: 12 ÷ 40 × 100 = 30%. A source with 12 matched words out of 60 eligible words has 20% reverse coverage. Illustrative arithmetic, not an executed sample.</p>
            </aside>
            <p>Evidence shows the first 150 maximal passages per source, with one actual source occurrence per displayed passage. Coverage includes every qualifying matched position, even when the evidence list is capped. With no eligible words, coverage is unavailable—not zero.</p>
          </div>
          <h3 className="mt-7 text-lg font-semibold text-[#173f38] dark:text-emerald-100">Know what you exclude</h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Optional quotation exclusions recognize balanced straight double quotes, curly double quotes, guillemets and curly single quotes. Reference exclusion starts at the final standalone References, Bibliography or Works Cited heading and runs to the end; a later Markdown heading prevents that exclusion.</p>
            <p>Both draft and sources are affected. Matches cannot bridge excluded gaps. Inspect gray highlights for mistakes: recognizing quotation marks or a heading does not validate a citation.</p>
          </div>
        </section>

        <div className="sim-review-panel rounded-2xl border border-emerald-900/10 bg-[#f4f8f3] p-5 dark:border-emerald-100/15 dark:bg-emerald-300/5 sm:p-6">
          <section aria-labelledby="similarity-limits-heading">
            <h2 id="similarity-limits-heading" className="text-xl font-semibold tracking-tight text-[#173f38] dark:text-emerald-100">Know the boundaries</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>No web or academic corpus is searched. There is no AI or semantic matching: paraphrases, translated ideas and unsupplied sources can be missed. Unspaced Chinese, Japanese or Korean text may be under-segmented, making word counts and matches less useful.</p>
              <p>Each text allows 10,000 words and 60,000 UTF-16 characters. UTF-8 .txt or .md imports have a 256 KB limit; PDF, DOCX, URLs and OCR are unsupported. The cancellable local worker stops checks after 15 seconds; speed depends on your device.</p>
            </div>
          </section>
          <section aria-labelledby="similarity-review-heading" className="mt-6 border-t border-emerald-900/10 pt-6 dark:border-emerald-100/15">
            <h2 id="similarity-review-heading" className="text-xl font-semibold tracking-tight text-[#173f38] dark:text-emerald-100">Review evidence, not a verdict</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Writers can check quotations, editors can trace shared wording, and students can review assigned readings. Read surrounding sentences and verify attribution. Review labels record your judgment, not verification by the tool.</p>
              <p>Repeat mode groups exact whole normalized sentences using punctuation, line breaks and Intl sentence segmentation when available. It displays up to 150 groups and 100 occurrences per group, with complete totals. Repeated occurrences count copies beyond the first. Short or partly excluded sentences are omitted.</p>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-10 grid gap-8 border-t border-border pt-8 lg:grid-cols-2 lg:gap-12">
        <section id="similarity-privacy" aria-labelledby="similarity-privacy-heading" className="sim-privacy scroll-mt-24">
          <h2 id="similarity-privacy-heading" className="text-xl font-semibold tracking-tight text-[#173f38] dark:text-emerald-100">Local matching, deliberate sharing</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>The tool does not upload text or automatically persist drafts, sources or notes. Reload clears the workspace. Copy or save a TXT report with passages and notes, or keep it stats-only. If repeated evidence exceeds 120,000 characters, the report explicitly falls back to stats-only. Copied text and downloaded reports remain outside the workspace.</p>
            <p>Manual search offers up to five position-sampled passages, not risk flags. Preview the exact query, then explicitly follow the Google link to search. Nothing is searched automatically. Sitewide ads and analytics still operate separately; read our <Link href="/privacy" className={guideLinkClassName}>Privacy Policy</Link>.</p>
          </div>
        </section>
        <section aria-labelledby="similarity-context-heading" className="sim-context">
          <h2 id="similarity-context-heading" className="text-xl font-semibold tracking-tight text-[#173f38] dark:text-emerald-100">Similarity is not originality</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p><a href="https://guides.turnitin.com/hc/en-us/articles/23435833938701-Understanding-the-similarity-score" className={guideLinkClassName}>Turnitin&apos;s similarity guidance</a> distinguishes matches from proof of plagiarism. ByteVerse does not use Turnitin&apos;s database or scoring method and is not endorsed by Turnitin.</p>
            <p><a href="https://owl.purdue.edu/owl/research_and_citation/using_research/quoting_paraphrasing_and_summarizing/index.html" className={guideLinkClassName}>Purdue OWL&apos;s citation guidance</a> explains that paraphrases and summaries still require attribution. Changing words does not remove the obligation to credit ideas.</p>
            <p><a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide" className={guideLinkClassName}>Google&apos;s SEO Starter Guide</a> says ordinary duplicate content is not a blanket spam-policy violation; abusive copying is different. This percentage predicts neither rankings nor penalties.</p>
            <p>For editing, use <Link href="/tools/diff-checker" className={guideLinkClassName}>Diff Checker</Link> for line-by-line changes, <Link href="/tools/word-counter" className={guideLinkClassName}>Word Counter</Link> for length, or <Link href="/tools/readability-checker" className={guideLinkClassName}>Readability Checker</Link> for English reading estimates.</p>
          </div>
        </section>
      </div>

      <section id="similarity-faq" aria-labelledby="similarity-faq-heading" className="sim-faq mt-10 scroll-mt-24 border-t border-border pt-8 pb-6">
        <h2 id="similarity-faq-heading" className="text-2xl font-semibold tracking-tight text-[#173f38] dark:text-emerald-100">Frequently asked questions</h2>
        <dl className="mt-5 divide-y divide-border">
          {toolConfig.faqs.map((faq) => (
            <div key={faq.question} className="py-4 first:pt-0">
              <dt className="text-sm font-semibold text-foreground">{faq.question}</dt>
              <dd className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
