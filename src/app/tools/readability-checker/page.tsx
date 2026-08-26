import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, AlertTriangle } from "lucide-react";
import { ReadabilityCheckerTool } from "./readability-checker-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Readability Checker",
  title: "Readability Checker - Free Flesch Score Test Online",
  description:
    "Check readability score online free: Flesch Reading Ease, Flesch-Kincaid grade level, long-sentence flags, and fix advice — instant, private, no sign-up.",
  slug: "readability-checker",
  keywords: [
    "readability checker",
    "readability checker online",
    "readability checker free online",
    "readability score",
    "check readability score online",
    "readability test",
    "flesch kincaid calculator",
    "flesch reading ease checker",
    "readability checker flesch kincaid",
    "grade level checker",
    "readability checker tool",
    "reading level checker",
  ],
  featureList: [
    "Flesch Reading Ease score (0-100)",
    "Flesch-Kincaid grade level",
    "Long and very-long sentence flags",
    "Complex word percentage",
    "Copyable readability report",
  ],
  faqs: [
    {
      question: "How do I check my readability score online for free?",
      answer: "Paste your text into the checker above — it instantly calculates the Flesch Reading Ease score, Flesch-Kincaid grade level, and flags overlong sentences. Free, no sign-up, and the text never leaves your browser.",
    },
    {
      question: "What is a good readability score?",
      answer: "For blogs, marketing, and general web content, aim for a Flesch Reading Ease of 60-80 (grade 6-9). News writing averages around 60; academic writing falls below 30. Higher scores mean easier reading — and easier reading keeps visitors on the page.",
    },
    {
      question: "What is the Flesch-Kincaid grade level?",
      answer: "It estimates the US school grade needed to understand your text on first read — a grade of 8.0 means an eighth-grader can follow it. It is computed from sentence length and syllables per word, the two biggest drivers of reading difficulty.",
    },
    {
      question: "Does readability affect SEO?",
      answer: "Indirectly but meaningfully: readable content earns longer dwell time, more completed reads, and more shares — engagement signals that correlate with rankings. Clear, well-structured text is also easier for AI search engines to quote accurately.",
    },
    {
      question: "How do I improve a bad readability score?",
      answer: "Three fixes handle most of it: split every sentence over 25 words, swap 3+ syllable words for shorter ones (utilize → use), and break long paragraphs. Rerun the check after each pass — scores respond fast.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const scoreBands = [
  { range: "90–100", label: "Very easy", grade: "5th grade", fits: "Kids' content, ultra-simple copy" },
  { range: "80–89", label: "Easy", grade: "6th grade", fits: "Consumer marketing, emails" },
  { range: "70–79", label: "Fairly easy", grade: "7th grade", fits: "Blogs, social posts — the sweet spot" },
  { range: "60–69", label: "Standard", grade: "8th–9th grade", fits: "News, most web content" },
  { range: "50–59", label: "Fairly difficult", grade: "10th–12th grade", fits: "Technical guides, B2B" },
  { range: "30–49", label: "Difficult", grade: "College", fits: "Academic, legal, expert docs" },
  { range: "0–29", label: "Very difficult", grade: "Postgraduate", fits: "Research papers only" },
];

const improveTips = [
  { tip: "Split sentences over 25 words", detail: "Sentence length is the #1 score driver. One idea per sentence — the period is your friend." },
  { tip: "Swap long words for short ones", detail: "Utilize → use, approximately → about, demonstrate → show. Syllables per word is the #2 driver." },
  { tip: "Break up paragraph walls", detail: "3-4 sentences per paragraph on the web. White space is a readability feature the formulas cannot even see." },
  { tip: "Front-load the point", detail: "Answer first, context after — readers (and AI search engines) reward pages that get to it." },
  { tip: "Read it aloud once", detail: "Anywhere you stumble out loud, a reader stumbles silently. Fix those spots and re-check." },
];

export default function ReadabilityCheckerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free Writing Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Readability Checker — Free Flesch Score Test
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Check your readability score online in seconds: Flesch Reading Ease, Flesch-Kincaid grade
          level, complex-word percentage, and the exact sentences to trim. Everything runs in your
          browser — your text is never uploaded.
        </p>
      </div>

      <ReadabilityCheckerTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Check Readability in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Paste your text", detail: "Blog post, email, essay, landing page — the score updates live as you type or edit." },
            { step: "Read the two scores", detail: "Reading Ease (0-100, higher = easier) tells you how it feels; grade level tells you who can follow it." },
            { step: "Trim what the tool flags", detail: "Split the flagged long sentences, shorten complex words, and watch the score climb in real time." },
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

      {/* Score bands */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">What Your Readability Score Means</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
          The Flesch Reading Ease scale, decoded — with the audience each band actually fits:
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold">Score</th>
                <th className="p-3.5 font-bold">Level</th>
                <th className="p-3.5 font-bold">Grade</th>
                <th className="p-3.5 font-bold">Best for</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {scoreBands.map((band) => (
                <tr key={band.range} className="border-b border-border last:border-0">
                  <td className="p-3.5 font-mono font-semibold text-foreground">{band.range}</td>
                  <td className="p-3.5">{band.label}</td>
                  <td className="p-3.5">{band.grade}</td>
                  <td className="p-3.5">{band.fits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-4">
          The benchmark most writers miss: mainstream success lives lower than pride wants. Bestselling
          novels average grade 7; the most-shared articles online cluster around grade 8. Writing
          "down" is not dumbing down — it is respect for the reader's time, and it is the house style
          of every publication people actually finish.
        </p>
      </section>

      {/* Why it matters */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Why Readability Matters for SEO and AI Search</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
          Google does not use a readability score as a ranking factor — but it measures what
          readability *causes*. Hard-to-read pages get abandoned; abandoned pages send weak engagement
          signals; and pages nobody finishes earn no links or shares. Readable writing is also
          structurally easier for AI answer engines to quote, which is why clear, front-loaded prose
          is a pillar of the <Link href="/blog/how-to-rank-in-ai-search-2026" className="text-primary hover:underline">AI search ranking playbook</Link> and
          of <Link href="/blog/how-to-write-seo-friendly-blog-posts-2026" className="text-primary hover:underline">SEO-friendly writing</Link> generally.
        </p>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          The workflow that works: draft freely, run this check, fix the flags, then run the{" "}
          <Link href="/tools/seo-title-analyzer" className="text-primary hover:underline">SEO title checker</Link> on your headline and the{" "}
          <Link href="/tools/word-counter" className="text-primary hover:underline">word counter</Link> for length — three checks, five minutes, publish with confidence. Writers using the{" "}
          <Link href="/blog/how-to-write-blog-posts-with-ai-2026" className="text-primary hover:underline">AI-assisted writing workflow</Link> should note: AI drafts
          often score *too* uniform — same sentence length everywhere — so the human edit pass is where rhythm returns.
        </p>
      </section>

      {/* Improve tips */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">5 Fixes That Raise Any Readability Score</h2>
        <div className="grid gap-4">
          {improveTips.map((t) => (
            <div key={t.tip} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base">{t.tip}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{t.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 p-5 rounded-2xl border border-border bg-card">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            <AlertTriangle size={15} className="text-amber-500 inline mr-1.5 -mt-0.5" />
            One honest limit: formulas count syllables and sentence lengths — they cannot judge
            clarity of *thought*. A grade-6 score with muddled logic still loses readers, and a
            grade-11 score can be perfectly right for an expert audience. Use the score as a smoke
            alarm, not a style guide.
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Complete Your Writing Toolkit</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/seo-title-analyzer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> SEO Title Checker — score your headline next</Link></li>
              <li><Link href="/tools/word-counter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Word Counter — length, reading and speaking time</Link></li>
              <li><Link href="/tools/plagiarism-checker" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Similarity Checker — verify originality</Link></li>
              <li><Link href="/tools/ai-content-detector" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> AI Content Detector — human or AI text?</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/how-to-write-seo-friendly-blog-posts-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Write SEO-Friendly Blog Posts</Link></li>
              <li><Link href="/blog/how-to-write-seo-titles-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Write SEO Titles That Get Clicks</Link></li>
              <li><Link href="/blog/how-to-write-blog-posts-with-ai-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Write Blog Posts with AI (Without Penalties)</Link></li>
              <li><Link href="/blog/blog-seo-checklist-before-publishing-in-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Blog SEO Checklist Before Publishing</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
