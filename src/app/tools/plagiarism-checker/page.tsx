import type { Metadata } from "next";
import Link from "next/link";
import { PlagiarismTool } from "./plagiarism-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import {
  Search, FileText, GitCompare, Shield, Fingerprint, Zap,
  ClipboardPaste, SlidersHorizontal, MousePointerClick,
  Bot, Type, AudioLines, Eraser,
  ChevronDown,
} from "lucide-react";

const toolConfig = {
  name: "Similarity & Plagiarism Checker",
  title: "Similarity Checker - Free Plagiarism & Uniqueness Tool",
  description:
    "Free similarity checker: check text uniqueness and compare documents for plagiarism online. N-gram analysis, cosine similarity, sentence matching — 100% private, in-browser.",
  slug: "plagiarism-checker",
  keywords: [
    "similarity checker",
    "similarity check",
    "check for similarity for free",
    "uniqueness checker",
    "similarity detector",
    "plagiarism checker",
    "plagiarism detector",
    "text similarity checker",
    "duplicate content checker",
    "free plagiarism checker",
    "compare texts online",
    "content uniqueness checker",
  ],
  faqs: [
    {
      question: "How do I check similarity between two texts?",
      answer:
        "Choose Compare Texts mode, paste both documents side by side, and the tool scores their overlap using Jaccard similarity, cosine similarity, and 5-word phrase matching — with the most similar sentences highlighted.",
    },
    {
      question: "Is this similarity checker really free and unlimited?",
      answer:
        "Yes — free, no word limits, no daily caps, no sign-up. Because everything runs in your browser instead of on a server, there is nothing to meter.",
    },
    {
      question: "How does plagiarism checking work?",
      answer:
        "The tool offers two modes: Uniqueness Check analyzes each sentence for personal, generic, or textbook-style patterns and provides Google search links for manual verification. Compare Texts uses Jaccard similarity, cosine similarity, and n-gram matching to measure overlap between two documents.",
    },
    {
      question: "Is my text safe and private?",
      answer:
        "Absolutely. All analysis runs 100% in your browser using JavaScript. No text is uploaded, stored, or sent to any server. Your content never leaves your device.",
    },
    {
      question: "Can this replace paid plagiarism tools?",
      answer:
        "This tool is great for quick checks and text comparison. For comprehensive web-based plagiarism scanning against billions of pages, you may still need a paid service. Our tool excels at document-to-document comparison and provides Google search links for manual web checking.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const features = [
  {
    icon: Search,
    title: "Uniqueness Analysis",
    desc: "Analyzes each sentence for personal, generic, or textbook-style patterns and flags content that needs verification.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: GitCompare,
    title: "Side-by-Side Compare",
    desc: "Paste two texts and get a detailed similarity breakdown using three proven analysis algorithms.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Fingerprint,
    title: "N-Gram Matching",
    desc: "Finds identical 5-word phrases across both texts using Jaccard index for precise overlap detection.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Shield,
    title: "100% Private",
    desc: "All analysis runs in your browser. No text is uploaded, stored, or sent to any server — ever.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: FileText,
    title: "Cosine Similarity",
    desc: "Measures word frequency overlap between documents to calculate how similar two texts really are.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Zap,
    title: "Instant Results",
    desc: "Get your analysis in under a second. No waiting, no queues, no accounts, no limits.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

const steps = [
  {
    num: "01",
    icon: ClipboardPaste,
    title: "Paste Your Text",
    desc: "Drop any text into the input — essays, blog posts, articles, or AI-generated content you want to verify.",
  },
  {
    num: "02",
    icon: SlidersHorizontal,
    title: "Choose Mode",
    desc: "Select Uniqueness Check for single-text analysis or Compare Texts for side-by-side document comparison.",
  },
  {
    num: "03",
    icon: MousePointerClick,
    title: "Review Results",
    desc: "Get a detailed breakdown with similarity scores, flagged sentences, and Google search links for verification.",
  },
];

const relatedTools = [
  {
    icon: Eraser,
    title: "Plagiarism Remover",
    desc: "Rewrite flagged text to make it unique and human-sounding",
    href: "/tools/plagiarism-remover",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Bot,
    title: "AI Content Detector",
    desc: "Check if text was written by ChatGPT or other AI",
    href: "/tools/ai-content-detector",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Type,
    title: "Word Counter",
    desc: "Count words, characters, sentences, and reading time",
    href: "/tools/word-counter",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: AudioLines,
    title: "Text to Speech",
    desc: "Convert any text to natural-sounding audio instantly",
    href: "/tools/text-to-speech",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export default function PlagiarismCheckerPage() {
  const stats = [
    { value: "3", label: "Analysis Algorithms" },
    { value: "5-gram", label: "Phrase Matching" },
    { value: "100%", label: "Browser-Based" },
    { value: "< 1s", label: "Processing Time" },
  ];

  return (
    <>
      <ToolJsonLd config={toolConfig} />

      {/* ── Hero Banner ── */}
      <section className="hero-bg relative overflow-hidden bg-linear-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-emerald-300 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Free &middot; No Signup Required
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
              Similarity & Plagiarism Checker<br className="hidden sm:block" />
              <span className="bg-linear-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">Free, Private, Unlimited</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mb-8">
              Check text uniqueness or check similarity between two texts — free online, no word limits, no sign-up.
              Advanced n-gram analysis, cosine similarity, and sentence matching run entirely in your browser.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
          </svg>
        </div>
      </section>

      {/* ── Tool Section ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <PlagiarismTool />
      </section>

      {/* ── Stats Bar ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-center group hover:border-violet-500/30 transition-colors duration-300"
            >
              <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <p className="relative text-2xl sm:text-3xl font-extrabold bg-linear-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="relative text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-xs font-semibold text-violet-500 dark:text-violet-400 mb-4 uppercase tracking-wider">
            Core Features
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Everything You Need to<br className="hidden sm:block" /> Verify Text Originality
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mt-3 max-w-2xl mx-auto">
            Two analysis modes and three matching algorithms working together to catch duplicated content.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative p-6 rounded-2xl border border-border bg-card hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-violet-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className={`relative w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 ring-1 ring-inset ring-black/5 dark:ring-white/5`}>
                <f.icon size={22} className={f.color} />
              </div>
              <h3 className="relative font-bold text-foreground mb-2 text-base">{f.title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative overflow-hidden bg-linear-to-b from-muted/50 to-background border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs font-semibold text-blue-500 dark:text-blue-400 mb-4 uppercase tracking-wider">
              How It Works
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Check Originality in 3 Steps
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-3 max-w-lg mx-auto">
              No complicated setup, no learning curve. Just paste, choose, and review.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-linear-to-r from-violet-500/20 via-blue-500/30 to-emerald-500/20" />

            {steps.map((step, i) => {
              const stepColors = [
                { gradient: "from-violet-500 to-purple-600", bg: "bg-violet-500/10", text: "text-violet-500" },
                { gradient: "from-blue-500 to-cyan-600", bg: "bg-blue-500/10", text: "text-blue-500" },
                { gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-500/10", text: "text-emerald-500" },
              ];
              const color = stepColors[i] || stepColors[0];
              return (
                <div key={step.num} className="relative text-center group">
                  <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br ${color.gradient} text-white text-sm font-extrabold mb-5 shadow-lg ring-4 ring-background`}>
                    {step.num}
                  </div>
                  <div className={`w-14 h-14 rounded-2xl ${color.bg} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon size={26} className={color.text} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SEO Content ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-5">
              Why Use a Plagiarism Checker?
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                Whether you are submitting an academic paper, publishing a blog post, or reviewing content from freelancers, checking for plagiarism protects your reputation and SEO rankings. Search engines penalize duplicate content, and academic institutions can flag unoriginal work.
              </p>
              <p>
                ByteVerse&apos;s plagiarism checker offers two analysis modes. The <strong>Uniqueness Check</strong> analyzes each sentence for personal, generic, or textbook-style patterns and provides Google search links for manual verification. The <strong>Compare Texts</strong> mode uses Jaccard similarity, cosine similarity, and n-gram matching to measure overlap between two documents.
              </p>
              <p>
                After checking, use our <Link href="/tools/plagiarism-remover" className="text-primary hover:underline">Plagiarism Remover</Link> to rewrite flagged content, or run text through the <Link href="/tools/ai-content-detector" className="text-primary hover:underline">AI Content Detector</Link> to verify it does not trigger AI detection flags. For word count requirements, use the <Link href="/tools/word-counter" className="text-primary hover:underline">Word Counter</Link>.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Analysis Modes Explained</h3>
            <div className="space-y-3">
              {[
                { title: "Uniqueness Check", desc: "Scans each sentence for personal pronouns, specifics, and informal tone — flags textbook-style writing." },
                { title: "Compare Texts", desc: "Side-by-side analysis using cosine similarity, Jaccard index, and 5-gram phrase matching." },
                { title: "Google Search Links", desc: "Every flagged sentence includes a direct Google search link so you can check for exact matches." },
                { title: "Sentence-Level Matching", desc: "Identifies the most similar passages between two texts with per-sentence scoring." },
                { title: "Privacy First", desc: "All processing happens in your browser — your text never touches a server." },
              ].map((tip) => (
                <div key={tip.title} className="flex gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-violet-500/20 transition-colors duration-200">
                  <span className="w-1.5 h-6 rounded-full bg-linear-to-b from-violet-500 to-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Accordion ── */}
      <section className="relative overflow-hidden bg-linear-to-b from-muted/50 to-background border-y border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-4 uppercase tracking-wider">
              FAQ
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-3">
              Everything you need to know about our plagiarism checker tool.
            </p>
          </div>

          <div className="space-y-3">
            {toolConfig.faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-violet-500/20 transition-colors duration-200"
              >
                <summary className="flex items-center justify-between gap-3 px-6 py-4 cursor-pointer list-none font-semibold text-foreground text-sm hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                  {faq.question}
                  <ChevronDown size={18} className="text-muted-foreground shrink-0 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related Tools ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Related Free Tools
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mt-3">
            Finish the job — rewrite, verify, and polish your text with these companions.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {relatedTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group p-5 rounded-2xl border border-border bg-card hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-11 h-11 rounded-xl ${tool.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <tool.icon size={20} className={tool.color} />
              </div>
              <h3 className="font-bold text-sm group-hover:text-violet-500 transition-colors duration-200">{tool.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </section>

    </>
  );
}
