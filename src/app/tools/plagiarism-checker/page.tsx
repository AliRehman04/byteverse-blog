import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { PlagiarismTool } from "./plagiarism-tool";

const toolConfig = {
  name: "Text Similarity Checker",
  title: "Text Similarity Checker - Compare Two Texts Free",
  description:
    "Compare two texts or a draft with up to five supplied sources. Review matches and context, then save a report. Free on-device matching. No web scan.",
  slug: "plagiarism-checker",
  keywords: [
    "text similarity checker",
    "text similarity checker online",
    "free text similarity checker",
    "text similarity percentage",
    "compare two texts",
    "compare two texts for plagiarism",
    "compare two documents",
    "compare multiple texts",
    "duplicate sentence checker",
  ],
  applicationCategory: "ProductivityApplication",
  audience: "Writers, editors and students reviewing source citations",
  featureList: [
    "Compare two texts or one draft with up to five supplied sources on-device",
    "Consecutive normalized word matching with 4, 6, 8 or 12-word minimums",
    "Draft and reverse-source coverage, with one-source, multi-source and unmatched eligible-word totals",
    "Per-source only-here and also-elsewhere counts within supplied sources",
    "Full documents and bounded focused-context views with original-text highlights",
    "Full normalized passage occurrence lookup: first 20 navigable positions and complete totals",
    "Source and review-status filters with document, longest-match or source ordering",
    "Optional balanced-quotation and final reference-section exclusions",
    "Exact normalized whole-sentence repetition checking within one draft",
    "Copy or download TXT reports and self-contained, printable HTML reports",
    "Full reports retain result evidence despite filters; stats-only omits source labels, notes and passage text",
    "Manual Google search links after query preview and an explicit click",
  ],
  faqs: [
    {
      question: "Does a similarity percentage prove plagiarism?",
      answer:
        "No. Coverage counts eligible draft words that match your supplied sources, once per word. The breakdown separates matches in exactly one source, matches in multiple sources and words with no qualifying match. Duplicate source entries count separately. Shared wording does not identify an original author, and zero coverage under your settings does not prove originality. Review context and attribution.",
    },
    {
      question: "Can I compare two texts or documents for free?",
      answer:
        "Yes, with no account: paste two texts, or compare one draft with up to five labeled sources. Switch between Full documents and bounded Focused context views to inspect matches. Each text is limited to 10,000 words and 60,000 UTF-16 characters. UTF-8 .txt and .md imports are limited to 256 KB. PDF, DOCX and URL imports are not supported.",
    },
    {
      question: "How is this different from a duplicate sentence checker or a diff?",
      answer:
        "Compare mode finds consecutive normalized word runs across supplied texts. Repeat mode groups exact whole normalized sentences within one draft, subject to the selected minimum length. A diff shows changes between versions; similarity compares shared wording even at different positions. Neither similarity mode detects AI writing, understands paraphrased ideas or produces an originality score.",
    },
    {
      question: "Do exclusions, filters or review labels change the percentage?",
      answer:
        "Quotation and reference-section exclusions remove eligible words on both sides, so they can change coverage; they do not validate citations. Source filters, the All evidence view and the Not reviewed, Citation checked, Common wording and Needs revision labels organize evidence. Sort by document order, longest match or source. Filters, sorting and review labels do not change coverage or remove evidence from full reports.",
    },
    {
      question: "Can I save a report, and what happens to my text?",
      answer:
        "Copy a report or download TXT or self-contained HTML. To print or save as PDF, open the HTML file and use your browser's Print menu; there is no direct PDF export or automatic printing. Stats-only omits source labels, notes and passage text. The tool does not upload text or save work automatically; reload clears the workspace. Manual search sends the previewed query to Google only on an explicit click. Sitewide ads and analytics are separate.",
    },
  ],
};

const baseMetadata = generateToolMetadata(toolConfig);
const socialImage = {
  url: `/tools/${toolConfig.slug}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "ByteVerse Text Similarity Checker: a fictional draft and supplied source with matching wording highlighted in context. Local comparison, not a plagiarism verdict.",
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

const guideLinkClassName = "font-medium text-primary underline decoration-primary/35 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export default function PlagiarismCheckerPage() {
  return (
    <div className="sim-page">
      <ToolJsonLd config={toolConfig} />

      <nav aria-label="Breadcrumb" className="sim-breadcrumb mb-3 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href="/" className="inline-flex min-h-9 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/tools" className="inline-flex min-h-9 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Tools</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-foreground">Text similarity checker</li>
        </ol>
      </nav>

      <header className="sim-hero">
        <div className="sim-hero-copy min-w-0">
          <p className="sim-hero-kicker">Free · Supplied-text review</p>
          <h1 className="sim-hero-title">Text similarity checker</h1>
          <p className="sim-hero-subtitle">See the match. Understand the context.</p>
          <p className="sim-hero-description">
            Compare two texts, or a draft with up to five supplied sources. Review shared wording and source overlap—not a plagiarism verdict or an internet scan.
          </p>
          <div className="sim-hero-actions">
            <a href="#similarity-workspace" className="sim-hero-primary">
              Compare texts <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#similarity-method" className="sim-hero-secondary">How matching works</a>
          </div>
          <ul className="sim-hero-proof" aria-label="Tool at a glance" role="list">
            <li>1 draft + up to 5 sources</li>
            <li>Local matching</li>
            <li>No account</li>
          </ul>
        </div>
        <figure className="sim-hero-illustration min-w-0">
          <figcaption className="sim-hero-demo-top">
            <span>Shared wording</span>{" "}<span>Fictional illustration</span>
          </figcaption>
          <dl className="sim-demo-pair">
            <div>
              <dt className="sim-demo-label">Your draft</dt>
              <dd className="sim-demo-line">Each weekday, <mark>the reading room opens before sunrise</mark>.</dd>
            </div>
            <div>
              <dt className="sim-demo-label">Supplied source</dt>
              <dd className="sim-demo-line">For early visitors, <mark>the reading room opens before sunrise</mark>.</dd>
            </div>
          </dl>
          <p className="sim-demo-footer">A match is a place to review, not a verdict.</p>
        </figure>
      </header>

      <div className="mt-5"><PlagiarismTool /></div>

      <nav aria-label="Text similarity guide" className="sim-guide-nav mt-6 flex flex-wrap gap-x-6 gap-y-1 border-b border-border pb-3 text-sm">
        <a href="#similarity-method" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Method & limits</a>
        <a href="#similarity-privacy" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Text & privacy</a>
        <a href="#similarity-faq" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>FAQs</a>
      </nav>

      <section aria-labelledby="similarity-start-heading" className="sim-steps mt-8">
        <h2 id="similarity-start-heading" className="text-xl font-semibold tracking-tight text-foreground">From shared wording to a useful review</h2>
        <ol className="mt-5 grid gap-5 border-b border-border pb-7 md:grid-cols-3 md:gap-8">
          {([
            { title: "Add your material", text: "Paste two texts, or add up to five labeled sources for one draft. Only material you supply is compared." },
            { title: "Read the evidence", text: "Use Full documents or Focused context. Filter by review status and inspect occurrences of a selected passage." },
            { title: "Keep a review record", text: "Add your own labels and notes. Copy a report or download TXT or HTML; printing is your choice." },
          ]).map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span aria-hidden="true" className="pt-0.5 text-xs font-semibold tabular-nums text-primary">0{index + 1}</span>
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
          <h2 id="similarity-method-heading" className="text-2xl font-semibold tracking-tight text-foreground">What the percentage measures</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>Matching finds consecutive Unicode letter-and-number word runs of at least <strong className="text-foreground">4, 6 (default), 8 or 12 words</strong>. Spaces and punctuation are ignored; internal curly apostrophes are normalized. Unicode NFKC normalization harmonizes compatible character forms. Case folding is optional; accents are retained.</p>
            <p>Main coverage counts the union of matched, eligible draft-word positions across sources. Each word counts once. Reverse coverage uses each source&apos;s eligible words as its denominator, so swapping draft and source can change the percentage. Source percentages are not additive.</p>
            <p>The overlap breakdown partitions all eligible draft words into matches in <strong className="text-foreground">exactly one supplied source</strong>, matches in <strong className="text-foreground">multiple supplied sources</strong>, and <strong className="text-foreground">no qualifying match</strong>. The three counts add up to the eligible-word total. Duplicate source entries count separately: adding the same source twice can move words into the multiple-source category without increasing overall coverage.</p>
            <p>For each source, &ldquo;only here&rdquo; counts draft words matched in that entry and no other supplied entry; &ldquo;also elsewhere&rdquo; counts draft words also matched in another supplied entry. &ldquo;Elsewhere&rdquo; means your supplied set, not the web. These counts do not establish original authorship, and unmatched words are not proof of originality.</p>
            <aside aria-label="Fictional coverage calculation" className="border-l-2 border-primary bg-primary/5 py-3 pr-3 pl-4 text-foreground">
              <p className="font-semibold">A fictional calculation</p>
              <p className="mt-1">12 matched words out of 40 eligible draft words: 12 ÷ 40 × 100 = 30%.</p>
              <p className="mt-2">Of those 40 words, 8 match exactly one source, 4 match multiple supplied sources and 28 have no qualifying match: 8 + 4 + 28 = 40. The 4 shared words count once in the 12 matched words, not once per source.</p>
              <p className="mt-2">A source with 12 matched words out of 60 eligible words has 20% reverse coverage. Illustrative arithmetic, not an executed sample.</p>
            </aside>
            <p>Evidence shows the first 150 maximal passages per source, with one actual source occurrence recorded per displayed passage. Selecting a passage looks up the same full normalized wording in that source on demand. You can navigate the first 20 qualifying occurrences in source order; the total still counts every qualifying occurrence, including overlaps.</p>
            <p>Coverage includes every qualifying matched position, even when the evidence list is capped. With no eligible words, coverage is unavailable—not zero.</p>
          </div>
          <h3 className="mt-7 text-lg font-semibold text-foreground">Know what you exclude</h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Optional quotation exclusions recognize balanced straight double quotes, curly double quotes, guillemets and curly single quotes. Reference exclusion starts at the final standalone References, Bibliography or Works Cited heading and runs to the end; a later Markdown heading prevents that exclusion.</p>
            <p>Both draft and sources are affected. Matches cannot bridge excluded gaps. Inspect gray highlights for mistakes: recognizing quotation marks or a heading does not validate a citation.</p>
          </div>
        </section>

        <div className="sim-review-panel rounded-2xl border border-border bg-muted/50 p-5 sm:p-6">
          <section aria-labelledby="similarity-limits-heading">
            <h2 id="similarity-limits-heading" className="text-xl font-semibold tracking-tight text-foreground">Know the boundaries</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>No web or academic corpus is searched. There is no AI or semantic matching: paraphrases, translated ideas and unsupplied sources can be missed. Unspaced Chinese, Japanese or Korean text may be under-segmented, making word counts and matches less useful.</p>
              <p>Each text allows 10,000 words and 60,000 UTF-16 characters. UTF-8 .txt or .md imports have a 256 KB limit; PDF, DOCX, URLs and OCR are unsupported. The cancellable local worker stops checks after 15 seconds; speed depends on your device.</p>
            </div>
          </section>
          <section aria-labelledby="similarity-review-heading" className="mt-6 border-t border-border pt-6">
            <h2 id="similarity-review-heading" className="text-xl font-semibold tracking-tight text-foreground">Review evidence, not a verdict</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Switch between Full documents and Focused context to read a match in place. Focused context is a bounded excerpt, not a replacement for the complete document. Read the surrounding text and verify attribution yourself.</p>
              <p>Filter passages by source or review status, then use document order, longest matches first or grouping by source. Review labels record your judgment, not verification by the tool. Filtering and sorting organize the review; they do not change coverage or restrict a full report to the visible selection.</p>
              <p>Repeat mode groups exact whole normalized sentences using punctuation, line breaks and Intl sentence segmentation when available. It displays up to 150 groups and 100 occurrences per group, with complete totals. Repeated occurrences count copies beyond the first. Short or partly excluded sentences are omitted.</p>
            </div>
          </section>
        </div>
      </div>

      <section aria-labelledby="similarity-use-cases-heading" className="mt-9">
        <h2 id="similarity-use-cases-heading" className="text-xl font-semibold tracking-tight text-foreground">Three practical ways to use the checker</h2>
        <div className="sim-use-cases mt-4">
          <article className="sim-use-case">
            <h3>Review a source citation</h3>
            <p>Compare an essay or article with a supplied reading. Open a matching passage in context, check the citation yourself, then mark Citation checked or Needs revision and leave a note.</p>
          </article>
          <article className="sim-use-case">
            <h3>Check reused editorial copy</h3>
            <p>Compare a new draft with earlier posts or approved boilerplate. Group matches by source or review the longest first. Mark intentional shared wording as Common wording; the tool does not decide whether reuse is acceptable.</p>
          </article>
          <article className="sim-use-case">
            <h3>Find duplicate sentences</h3>
            <p>Use Repeat mode without adding a source to find repeated whole sentences in one draft. Review each occurrence before editing. This duplicate sentence checker does not search for copies elsewhere on the web.</p>
          </article>
        </div>
      </section>

      <div className="mt-10 grid gap-8 border-t border-border pt-8 lg:grid-cols-2 lg:gap-12">
        <section id="similarity-privacy" aria-labelledby="similarity-privacy-heading" className="sim-privacy scroll-mt-24">
          <h2 id="similarity-privacy-heading" className="text-xl font-semibold tracking-tight text-foreground">Local matching, deliberate sharing</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>The tool does not upload text or automatically persist drafts, sources or notes. Reload clears the workspace. Copy a report or download TXT or a self-contained HTML review sheet. Full reports include all result evidence, not just the passages currently visible through source or status filters; the evidence caps still apply.</p>
            <p>Choose stats-only to omit source labels, notes and passage text. If included evidence exceeds 120,000 characters, the report explicitly falls back to stats-only. Copied text and downloaded reports remain outside the workspace, so check their contents before sharing.</p>
            <p>To print or save as PDF, open the downloaded HTML yourself and choose Print in your browser. This is not a direct PDF download, and nothing prints automatically. The self-contained HTML report displays supplied text as text, without scripts or external resources.</p>
            <p>Manual search offers up to five position-sampled passages, not risk flags. Preview the exact query, then explicitly follow the Google link to search. Nothing is searched automatically. Sitewide ads and analytics still operate separately; read our <Link href="/privacy" className={guideLinkClassName}>Privacy Policy</Link>.</p>
          </div>
        </section>
        <section aria-labelledby="similarity-context-heading" className="sim-context">
          <h2 id="similarity-context-heading" className="text-xl font-semibold tracking-tight text-foreground">Similarity is not originality</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p><a href="https://guides.turnitin.com/hc/en-us/articles/23435833938701-Understanding-the-similarity-score" className={guideLinkClassName}>Turnitin&apos;s similarity guidance</a> distinguishes matches from proof of plagiarism. ByteVerse does not use Turnitin&apos;s database or scoring method and is not endorsed by Turnitin.</p>
            <p><a href="https://owl.purdue.edu/owl/research_and_citation/using_research/quoting_paraphrasing_and_summarizing/index.html" className={guideLinkClassName}>Purdue OWL&apos;s citation guidance</a> explains that paraphrases and summaries still require attribution. Changing words does not remove the obligation to credit ideas.</p>
            <p><a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide" className={guideLinkClassName}>Google&apos;s SEO Starter Guide</a> says ordinary duplicate content is not a blanket spam-policy violation; abusive copying is different. This percentage predicts neither rankings nor penalties.</p>
            <p>To compare two document versions for line-by-line additions and removals, use <Link href="/tools/diff-checker" className={guideLinkClassName}>Diff Checker</Link>. Similarity finds shared normalized wording even at different positions; a diff is for reviewing changes between versions.</p>
            <p>Use <Link href="/tools/word-counter" className={guideLinkClassName}>Word Counter</Link> for length, or <Link href="/tools/readability-checker" className={guideLinkClassName}>Readability Checker</Link> for English reading estimates.</p>
          </div>
        </section>
      </div>

      <section id="similarity-faq" aria-labelledby="similarity-faq-heading" className="sim-faq mt-10 scroll-mt-24 border-t border-border pt-8 pb-6">
        <h2 id="similarity-faq-heading" className="text-2xl font-semibold tracking-tight text-foreground">Frequently asked questions</h2>
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
