import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { compareSources } from "@/lib/similarity/engine";
import { formatCoverage } from "@/lib/similarity/report";
import { GUIDE_SAMPLE } from "@/lib/similarity/samples";
import { DEFAULT_MATCH_OPTIONS } from "@/lib/similarity/types";
import { PlagiarismTool } from "./plagiarism-tool";
import { TextHighlights } from "./text-highlights";

const toolConfig = {
  name: "Text Similarity Checker",
  title: "Text Similarity Checker - Compare Two Texts Free",
  description:
    "Compare two texts for similarity, highlight shared passages and find repeated sentences. Free local matching with up to five sources. No web plagiarism scan.",
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
const guideExample = compareSources(GUIDE_SAMPLE.draft, GUIDE_SAMPLE.sources, DEFAULT_MATCH_OPTIONS);

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
        <h1 className="sim-hero-title">Text similarity checker</h1>
        <p className="sim-hero-description">Compare two texts. See the shared wording, side by side.</p>
        <p className="sim-hero-scope">Free, on-device comparison of sources you supply; not a plagiarism verdict or an internet scan.</p>
      </header>

      <PlagiarismTool />

      <div className="sim-reading-guide">
      <nav aria-label="Text similarity guide" className="sim-guide-nav mt-6 flex flex-wrap gap-x-6 gap-y-1 border-b border-border pb-3 text-sm">
        <a href="#similarity-workspace" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Back to checker</a>
        <a href="#similarity-example" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Worked example</a>
        <a href="#similarity-method" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Method & limits</a>
        <a href="#similarity-troubleshooting" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Troubleshooting</a>
        <a href="#similarity-privacy" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Text & privacy</a>
        <a href="#similarity-faq" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>FAQs</a>
      </nav>

      <section className="sim-guide-section" aria-labelledby="similarity-purpose-heading">
        <p className="sim-guide-byline">By <Link href="/about" className={guideLinkClassName}>ByteVerse</Link><span aria-hidden="true"> / </span>Updated <time dateTime="2026-10-31">October 31, 2026</time></p>
        <h2 id="similarity-purpose-heading">What a text similarity checker can tell you</h2>
        <p>A text similarity checker finds wording shared by the texts you give it. It is useful when you already have a draft and a possible source: an essay and its reading, a new article and an earlier post, or two passages that appear unusually close. ByteVerse highlights the actual matching words instead of asking you to trust a percentage on its own.</p>
        <p>The comparison set matters. This page compares your document with up to five supplied source texts. It cannot discover a source you have not supplied. If you came here to <strong>compare two texts for plagiarism</strong>, use the results to review quotations and attribution, not to certify a paper or accuse its author.</p>
        <div className="sim-guide-table-wrap" role="region" aria-label="Choose the right kind of comparison" tabIndex={0}>
          <table className="sim-guide-table">
            <caption>Choose the comparison that answers your question</caption>
            <thead><tr><th scope="col">Your question</th><th scope="col">Suitable check</th><th scope="col">What the result means</th></tr></thead>
            <tbody>
              <tr><th scope="row">Do these two texts share wording?</th><td>This text similarity checker</td><td>Qualifying consecutive words appear in both supplied texts, even at different positions.</td></tr>
              <tr><th scope="row">Did I repeat a sentence in one draft?</th><td>Repeated sentences mode</td><td>The same normalized whole sentence appears more than once. No external source is needed.</td></tr>
              <tr><th scope="row">What changed between two versions?</th><td><Link href="/tools/diff-checker" className={guideLinkClassName}>Diff Checker</Link></td><td>Additions and deletions between versions, rather than a source-overlap measurement.</td></tr>
              <tr><th scope="row">Does this paper match an online or academic database?</th><td>A service with access to the relevant corpus</td><td>Only the provider&apos;s actual search coverage can answer that question. ByteVerse does not run that search.</td></tr>
            </tbody>
          </table>
        </div>
        <p>A lexical match is not the same as a semantic match. Two sentences can express the same idea with different words and receive no match here. Conversely, independently written texts can share a conventional phrase. Neither result settles authorship, permission or academic integrity.</p>
      </section>

      <section aria-labelledby="similarity-start-heading" className="sim-steps mt-8">
        <h2 id="similarity-start-heading" className="text-xl font-semibold tracking-tight text-foreground">How to compare two texts for similarity</h2>
        <ol className="mt-5 grid gap-5 border-b border-border pb-7 md:grid-cols-3 md:gap-8">
          {([
            { title: "Add the document and source", text: "Paste the draft into Your document and the reference into Sources, or open/drop a TXT or Markdown file. On mobile, the two input tabs keep each text separate. A web address is not the text of a source." },
            { title: "Compare and inspect", text: "Select Compare texts. Begin with the 6-word minimum, then inspect highlighted passages in Full documents or Focused context. Open Match settings only when you need a different threshold or exclusions." },
            { title: "Record your decision", text: "Check the actual citation and surrounding argument. Add a review label and a specific note, then keep a TXT or HTML report if needed. Editing the inputs clears the old result and notes; save your report first." },
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

      <section id="similarity-example" className="sim-guide-section" aria-labelledby="similarity-example-heading">
        <h2 id="similarity-example-heading">Text similarity percentage: a reproducible example</h2>
        <p>These fictional passages are calculated by the same matching engine as the checker, with the default 6-word minimum, case ignored and exclusions off. They are not an assessment of a real writer. The highlighted draft below preserves the original wording.</p>
        <figure className="sim-guide-example">
          <figcaption>Your document <span>{guideExample.draft.stats.eligibleWords} eligible words</span></figcaption>
          <blockquote><TextHighlights text={GUIDE_SAMPLE.draft} matched={guideExample.draft.matchRanges} excluded={[]} markerId="guide-draft-match" /></blockquote>
          <dl className="sim-guide-source-pair">
            {GUIDE_SAMPLE.sources.map((source, index) => <div key={source.id}>
              <dt>Source {index + 1}: {source.label}</dt>
              <dd><TextHighlights text={source.text} matched={guideExample.sources[index].sourceRanges} excluded={[]} markerId={`guide-source-${index + 1}-match`} /></dd>
            </div>)}
          </dl>
        </figure>
        <div className="sim-guide-formula" aria-label="Calculated example coverage">
          <strong>{guideExample.draft.matchedWords} / {guideExample.draft.stats.eligibleWords} x 100 = {formatCoverage(guideExample.draft.coverage)}</strong>
          <span>Matched eligible draft words / all eligible draft words</span>
        </div>
        <p>The notice matches the first 15 draft words. The member guide matches the 9-word sentence that starts with &ldquo;Students use&rdquo;. Those nine positions are already included in the first match, so they do not count twice. The result is <strong>15 matched words, not 24</strong>.</p>
        <div className="sim-guide-table-wrap" role="region" aria-label="Verified source overlap calculation" tabIndex={0}>
          <table className="sim-guide-table">
            <caption>Coverage computed from the example above</caption>
            <thead><tr><th scope="col">Measure</th><th scope="col">Result</th><th scope="col">Why</th></tr></thead>
            <tbody>
              <tr><th scope="row">Overall draft coverage</th><td>{formatCoverage(guideExample.draft.coverage)}</td><td>15 distinct matched positions out of 21 eligible draft words.</td></tr>
              <tr><th scope="row">One supplied source only</th><td>{guideExample.draft.sourceOverlap.singleSourceWords} words</td><td>The opening sentence appears only in the first supplied source.</td></tr>
              <tr><th scope="row">Multiple supplied sources</th><td>{guideExample.draft.sourceOverlap.multiSourceWords} words</td><td>The second sentence appears in both source entries.</td></tr>
              <tr><th scope="row">No qualifying match</th><td>{guideExample.draft.sourceOverlap.unmatchedWords} words</td><td>The final sentence has no qualifying match in this supplied set.</td></tr>
              <tr><th scope="row">Source 1 covered by the draft</th><td>{formatCoverage(guideExample.sources[0].coverage)}</td><td>All 15 words of that source occur in the draft.</td></tr>
              <tr><th scope="row">Source 2 covered by the draft</th><td>{formatCoverage(guideExample.sources[1].coverage)}</td><td>9 of that source&apos;s 15 words occur in the draft.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Adding unrelated sentences can reduce a percentage without fixing a copied passage. Removing unrelated text can raise it without adding any shared wording. For revisions, compare the actual passages and matched-word counts with the same sources and settings. A changing denominator is not evidence that attribution improved.</p>
        <figure className="sim-guide-screenshot">
          <a href="/tools/text-similarity-matches.png" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size example screenshot">
            <Image src="/tools/text-similarity-matches.png" width={1256} height={348} unoptimized loading="lazy" alt="ByteVerse highlights the first two sentences of the fictional draft beside the matching reading-room notice." />
          </a>
          <figcaption>Actual result for the fictional example. All 15 words of source 1 match, so its pane shows 100%; the 21-word draft&apos;s overall coverage is still 71.4%.</figcaption>
        </figure>
      </section>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        <section id="similarity-method" aria-labelledby="similarity-method-heading" className="sim-method scroll-mt-24">
          <h2 id="similarity-method-heading" className="text-2xl font-semibold tracking-tight text-foreground">What the percentage measures</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>Matching finds consecutive Unicode letter-and-number word runs of at least <strong className="text-foreground">4, 6 (default), 8 or 12 words</strong>. Spaces and punctuation are ignored; internal curly apostrophes are normalized. Unicode NFKC normalization harmonizes compatible character forms. Case folding is optional; accents are retained.</p>
            <p>Main coverage counts the union of matched, eligible draft-word positions across sources. Each word counts once. Reverse coverage uses each source&apos;s eligible words as its denominator, so swapping draft and source can change the percentage. Source percentages are not additive.</p>
            <p>The overlap breakdown partitions all eligible draft words into matches in <strong className="text-foreground">exactly one supplied source</strong>, matches in <strong className="text-foreground">multiple supplied sources</strong>, and <strong className="text-foreground">no qualifying match</strong>. The three counts add up to the eligible-word total. Duplicate source entries count separately: adding the same source twice can move words into the multiple-source category without increasing overall coverage.</p>
            <p>For each source, &ldquo;only here&rdquo; counts draft words matched in that entry and no other supplied entry; &ldquo;also elsewhere&rdquo; counts draft words also matched in another supplied entry. &ldquo;Elsewhere&rdquo; means your supplied set, not the web. These counts do not establish original authorship, and unmatched words are not proof of originality.</p>
            <p>Evidence shows the first 150 maximal passages per source, with one actual source occurrence recorded per displayed passage. Selecting a passage looks up the same full normalized wording in that source on demand. You can navigate the first 20 qualifying occurrences in source order; the total still counts every qualifying occurrence, including overlaps.</p>
            <p>Coverage includes every qualifying matched position, even when the evidence list is capped. With no eligible words, coverage is unavailable—not zero.</p>
          </div>
          <h3 className="mt-7 text-lg font-semibold text-foreground">Know what you exclude</h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Optional quotation exclusions recognize balanced straight double quotes, curly double quotes, guillemets and curly single quotes. Reference exclusion starts at the final standalone References, Bibliography or Works Cited heading and runs to the end; a later Markdown heading prevents that exclusion.</p>
            <p>Both draft and sources are affected. Matches cannot bridge excluded gaps. Inspect gray highlights for mistakes: recognizing quotation marks or a heading does not validate a citation.</p>
          </div>
        </section>

        <div className="sim-review-panel">
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

      <section className="sim-guide-section" aria-labelledby="similarity-settings-heading">
        <h2 id="similarity-settings-heading">Choose a match length, not a target score</h2>
        <p>The minimum is the number of consecutive matching words needed to qualify. It is not a sensitivity percentage, a confidence level or a plagiarism threshold. Start with 6 words. If a particular phrase seems missing, inspect its length and exclusions before changing a setting.</p>
        <div className="sim-guide-table-wrap" role="region" aria-label="Minimum match settings" tabIndex={0}>
          <table className="sim-guide-table">
            <caption>What changes when the minimum changes</caption>
            <thead><tr><th scope="col">Minimum</th><th scope="col">Useful for</th><th scope="col">Trade-off</th></tr></thead>
            <tbody>
              <tr><th scope="row">4 words</th><td>Inspecting short phrases that deserve a closer look.</td><td>More conventional wording may qualify. A small match is not automatically meaningful.</td></tr>
              <tr><th scope="row">6 words, default</th><td>A first pass through prose and supplied references.</td><td>Shared runs shorter than six words are omitted, even if they are identical.</td></tr>
              <tr><th scope="row">8 words</th><td>Concentrating on longer shared wording.</td><td>Shorter unattributed quotations can disappear from the result.</td></tr>
              <tr><th scope="row">12 words</th><td>Reviewing extended verbatim passages.</td><td>A low result with this threshold is especially poor evidence that a document has no borrowing.</td></tr>
            </tbody>
          </table>
        </div>
        <p>For example, &ldquo;The reading room opens before sunrise&rdquo; contains six words. Compared with the uppercase version of the same sentence, it produces 100% coverage with the 4- or 6-word minimum and Ignore case enabled. At 8 words it produces 0%, because the complete run is too short. Those results are tested against the actual engine; none is a judgment about whether the sentence should be cited.</p>
        <h3>Exclusions can change both sides of the calculation</h3>
        <p>Excluding quotes removes eligible words, not just colored highlights. If all the words in a document are excluded, there is no denominator and the result is N/A. A bibliography exclusion may remove a long matching reference list, but it does not check whether an in-text citation is present or accurate. Review a baseline without exclusions first, then record which settings you changed.</p>
        <p>A phrase cannot match across an excluded gap. By contrast, ordinary punctuation and spacing are normalized, so changing a comma, capitalization with Ignore case on, or a line break does not necessarily remove a match. This is a wording comparison, not a punctuation diff.</p>
      </section>

      <section className="sim-guide-section" aria-labelledby="similarity-score-heading">
        <h2 id="similarity-score-heading">What is a good similarity score?</h2>
        <p>There is no universal safe percentage for plagiarism. A long, correctly attributed quotation can produce substantial similarity; an unattributed borrowed idea can produce none. Your assignment, publisher or organization may have its own rules, but a threshold is not a substitute for reading the matched material.</p>
        <p><a href="https://guides.turnitin.com/hc/en-us/articles/23435833938701-Understanding-the-similarity-score" className={guideLinkClassName}>Turnitin&apos;s official explanation of similarity scores</a> says matches need review and shows why proper quotations can match. Its database and settings differ from this tool. A ByteVerse result is not a prediction of a Turnitin score, and ByteVerse has no access to Turnitin&apos;s student-paper repository.</p>
        <h3>Review one match before judging the whole document</h3>
        <ol className="sim-review-checklist">
          <li><strong>Read the complete source passage.</strong> Check that the source label names the document you actually consulted. A match in two sources does not identify which author wrote it first.</li>
          <li><strong>Separate exact wording from the underlying idea.</strong> Verbatim borrowing normally needs quotation treatment and attribution under the applicable style. A paraphrase still needs credit for the source idea, even if no words are highlighted.</li>
          <li><strong>Verify the citation at the point of use.</strong> Check the author, title and locator when your style requires one. A reference-list entry at the end is not, by itself, a clear attribution of every passage in the draft.</li>
          <li><strong>Make a specific review note.</strong> For example, &ldquo;Checked the quotation against page 4; citation added to the preceding sentence.&rdquo; A label such as Citation checked records your decision, not an automated verification.</li>
          <li><strong>Revise the writing, not just the number.</strong> Correct an incomplete quotation, clarify the source of an idea, or write a genuinely independent explanation with appropriate credit. Save the report before editing, then compare again using the same sources and settings.</li>
        </ol>
        <p><a href="https://www.ox.ac.uk/students/academic/guidance/skills/plagiarism" className={guideLinkClassName}>Oxford&apos;s academic-integrity guidance</a> explains that changing a few words or closely following another argument without adequate acknowledgement can still be plagiarism. It also discusses quotation, inaccurate citation and reuse of your own assessed work. Check your own institution&apos;s policy rather than treating another university&apos;s rules as your assignment instructions.</p>
        <p>Consider two more fictional sentences: &ldquo;Students review their notes at quiet tables&rdquo; and &ldquo;Learners revise in a peaceful study area.&rdquo; They share an idea but have no qualifying six-word run, so this engine finds no matched words. Whether attribution is needed depends on where the idea came from and how it is used, not on that zero.</p>
      </section>

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

      <section id="similarity-troubleshooting" className="sim-guide-section" aria-labelledby="similarity-troubleshooting-heading">
        <h2 id="similarity-troubleshooting-heading">Why does the result look different from what I expected?</h2>
        <div className="sim-guide-table-wrap" role="region" aria-label="Text comparison troubleshooting" tabIndex={0}>
          <table className="sim-guide-table">
            <caption>Check the cause before drawing a conclusion</caption>
            <thead><tr><th scope="col">What you see</th><th scope="col">Possible explanation</th><th scope="col">What to check</th></tr></thead>
            <tbody>
              <tr><th scope="row">0% even though the ideas are similar</th><td>No consecutive word run reaches the selected minimum. Paraphrases and translations are not semantic matches here.</td><td>Read the argument and attribution manually. Do not use zero as an originality certificate.</td></tr>
              <tr><th scope="row">A short identical phrase is not highlighted</th><td>The phrase may be below the minimum or contain excluded words.</td><td>Count its words and inspect the gray exclusion highlights. Lower the minimum only when that serves your review.</td></tr>
              <tr><th scope="row">The percentage changes after swapping texts</th><td>Coverage is directional. The document and source can contain different numbers of eligible words.</td><td>Compare matched-word counts and each denominator, rather than expecting symmetric percentages.</td></tr>
              <tr><th scope="row">Source percentages add up to more than the overall result</th><td>The same draft positions can match several supplied sources.</td><td>Use the overall union count and the One source only / Multiple sources breakdown. Do not add source percentages.</td></tr>
              <tr><th scope="row">N/A, rather than 0%</th><td>There are no eligible words after exclusions.</td><td>Review quotation and reference settings. N/A is an unavailable calculation, not a passed check.</td></tr>
              <tr><th scope="row">The matching list is shorter than the total</th><td>Displayed evidence or occurrence navigation has reached a documented cap.</td><td>Read the result warnings. Coverage still includes every qualifying matched position; exporting a report does not remove the evidence caps.</td></tr>
              <tr><th scope="row">A copied PDF passage has odd matches</th><td>Copying can insert broken words, repeated page headers or incorrect reading order.</td><td>Inspect the pasted text against the original. Fix extraction errors before comparing. Do not remove substantive wording to lower the result.</td></tr>
              <tr><th scope="row">A file will not open</th><td>Only UTF-8 TXT and Markdown are supported; the byte, word or character limit may also be exceeded.</td><td>Export plain text in UTF-8 or paste an appropriate section. DOCX, PDF, images and URLs are not direct imports.</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Duplicate sentences are a separate kind of repetition</h3>
        <p>The duplicate sentence checker compares whole normalized sentences within one document. Two copies of the same sentence create one group and one copy beyond the first. A third copy increases the extra-copy count to two, not three. A repeated phrase inside otherwise different sentences will not necessarily form a repeated-sentence group.</p>
        <p>Repetition can be deliberate: a refrain, a standard notice or a repeated instruction. Inspect each occurrence in context. The tool does not delete sentences, rewrite your document or assume repetition is misconduct. For accidental duplication, edit the original document and run another check.</p>
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
            <p><a href="https://www.ox.ac.uk/students/academic/guidance/skills/plagiarism" className={guideLinkClassName}>Oxford&apos;s quotation and paraphrasing guidance</a> explains why a source&apos;s ideas and wording need appropriate acknowledgement. Changing words does not remove the obligation to credit ideas.</p>
            <p><a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide" className={guideLinkClassName}>Google&apos;s SEO Starter Guide</a> says ordinary duplicate content is not a blanket spam-policy violation; abusive copying is different. This percentage predicts neither rankings nor penalties.</p>
            <p>For website editors, comparing a new article with an older post can reveal reused introductions, product descriptions or boilerplate. That is an editorial check, not a site crawl or a canonicalization audit. Different URLs containing the same page are a separate technical issue. A low overlap result cannot promise rankings, and mechanically changing synonyms does not make a page more useful.</p>
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
    </div>
  );
}
