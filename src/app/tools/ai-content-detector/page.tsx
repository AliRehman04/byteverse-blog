import type { Metadata } from "next";
import Link from "next/link";
import { AiDetectorTool } from "./ai-detector-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import {
  Brain, BarChart3, Shuffle, Fingerprint, Shield, Zap,
  ClipboardPaste, ScanSearch, MousePointerClick,
  Eraser, FileSearch, Type, AudioLines,
  ChevronDown,
} from "lucide-react";

const toolConfig = {
  name: "AI Content Detector",
  title: "AI Content Detector - Free AI Text Detection Tool",
  description: "Detect AI-generated text using advanced linguistic analysis. Check if content was written by ChatGPT, Claude, or other AI models. 100% free, private, runs in your browser.",
  slug: "ai-content-detector",
  keywords: ["ai content detector", "ai text detector", "chatgpt detector", "ai writing detector", "ai detection tool", "detect ai content", "ai checker"],
  faqs: [
    { question: "How does AI detection work?", answer: "This tool analyzes 8 linguistic signals including sentence uniformity, vocabulary diversity, burstiness, AI phrase patterns, paragraph structure, personal voice, sentence starters, and punctuation variety to estimate the probability of AI-generated text." },
    { question: "Is this tool accurate?", answer: "This tool uses statistical heuristics and provides a reasonable estimate. It works best on English text of 100+ words. No AI detector is 100% accurate — use results as a guide alongside your own judgment." },
    { question: "Is my text safe?", answer: "Yes. All analysis runs entirely in your browser using JavaScript. No text is sent to any server, stored, or shared. Your content stays completely private." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const features = [
  {
    icon: BarChart3,
    title: "Sentence Uniformity",
    desc: "AI writes sentences of similar length. This signal measures length variance to detect robotic consistency.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Shuffle,
    title: "Vocabulary Diversity",
    desc: "AI reuses a smaller set of 'sophisticated' words. We measure type-token ratio to catch limited vocabulary.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Brain,
    title: "Burstiness Detection",
    desc: "Humans alternate between simple and complex sentences. AI stays eerily consistent — we catch that pattern.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Fingerprint,
    title: "AI Phrase Detection",
    desc: "Identifies signature phrases like 'delve into', 'it's important to note' commonly used by ChatGPT and Claude.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "100% Private",
    desc: "All analysis runs in your browser using JavaScript. No text is uploaded, stored, or sent to any server.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "Instant Analysis",
    desc: "Get your detection results in under a second. No waiting, no queues, no accounts, no limits.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

const steps = [
  {
    num: "01",
    icon: ClipboardPaste,
    title: "Paste Your Text",
    desc: "Drop any text — blog posts, essays, emails, or content you suspect was AI-generated. 100+ words recommended.",
  },
  {
    num: "02",
    icon: ScanSearch,
    title: "Run Detection",
    desc: "The tool scans 8 linguistic dimensions: uniformity, vocabulary, burstiness, AI phrases, voice, and more.",
  },
  {
    num: "03",
    icon: MousePointerClick,
    title: "Review Score",
    desc: "Get a clear Human vs AI probability score with per-signal breakdowns so you know exactly what triggered.",
  },
];

const relatedTools = [
  {
    icon: Eraser,
    title: "Plagiarism Remover",
    desc: "Rewrite AI text to sound human and pass detection",
    href: "/tools/plagiarism-remover",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: FileSearch,
    title: "Plagiarism Checker",
    desc: "Scan text for duplicate content and similarity",
    href: "/tools/plagiarism-checker",
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

export default function AiContentDetectorPage() {
  const stats = [
    { value: "8", label: "Linguistic Signals" },
    { value: "100+", label: "AI Phrases Tracked" },
    { value: "100%", label: "Browser-Based" },
    { value: "< 1s", label: "Detection Time" },
  ];

  return (
    <>
      <ToolJsonLd config={toolConfig} />

      {/* ── Hero Banner ── */}
      <section className="hero-bg relative overflow-hidden bg-linear-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-orange-300 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              100% Free &middot; No Signup Required
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
              Is It Human or<br className="hidden sm:block" />
              <span className="bg-linear-to-r from-orange-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">Written by AI?</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mb-8">
              Analyze text for AI-generated patterns using 8 linguistic signals. Detects ChatGPT, Claude, Gemini, and other AI writing styles — entirely in your browser.
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
        <AiDetectorTool />
      </section>

      {/* ── Stats Bar ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-center group hover:border-orange-500/30 transition-colors duration-300"
            >
              <div className="absolute inset-0 bg-linear-to-br from-orange-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <p className="relative text-2xl sm:text-3xl font-extrabold bg-linear-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-xs font-semibold text-orange-500 dark:text-orange-400 mb-4 uppercase tracking-wider">
            Detection Signals
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            8 Signals That Reveal<br className="hidden sm:block" /> AI-Generated Text
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mt-3 max-w-2xl mx-auto">
            Our detector analyzes multiple linguistic dimensions that distinguish human writing from AI output.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative p-6 rounded-2xl border border-border bg-card hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-orange-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/20 bg-rose-500/5 text-xs font-semibold text-rose-500 dark:text-rose-400 mb-4 uppercase tracking-wider">
              How It Works
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Detect AI Content in 3 Steps
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-3 max-w-lg mx-auto">
              No complicated setup, no learning curve. Just paste, scan, and review.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-linear-to-r from-orange-500/20 via-rose-500/30 to-violet-500/20" />

            {steps.map((step, i) => {
              const stepColors = [
                { gradient: "from-orange-500 to-amber-600", bg: "bg-orange-500/10", text: "text-orange-500" },
                { gradient: "from-rose-500 to-pink-600", bg: "bg-rose-500/10", text: "text-rose-500" },
                { gradient: "from-violet-500 to-purple-600", bg: "bg-violet-500/10", text: "text-violet-500" },
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
              Why Use an AI Content Detector?
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                With AI writing tools like ChatGPT becoming mainstream, it is harder than ever to tell human-written content from machine-generated text. Whether you are an educator checking student submissions, an editor verifying freelancer work, or a marketer ensuring content authenticity — an AI detector gives you confidence.
              </p>
              <p>
                ByteVerse&apos;s AI content detector analyzes 8 distinct linguistic signals including sentence uniformity, vocabulary diversity, burstiness, AI phrase patterns, personal voice markers, and punctuation variety. Each signal is scored independently, giving you a transparent breakdown rather than a black-box verdict.
              </p>
              <p>
                If text is flagged as AI-generated, use our <Link href="/tools/plagiarism-remover" className="text-primary hover:underline">Plagiarism Remover &amp; AI Humanizer</Link> to rewrite it naturally. Verify originality with the <Link href="/tools/plagiarism-checker" className="text-primary hover:underline">Plagiarism Checker</Link>, and use the <Link href="/tools/word-counter" className="text-primary hover:underline">Word Counter</Link> to ensure your content meets length requirements.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Tips for Accurate Results</h3>
            <div className="space-y-3">
              {[
                { title: "Use 100+ Words", desc: "Short snippets lack enough data for reliable analysis. Paste at least a full paragraph." },
                { title: "300+ Words is Ideal", desc: "Longer texts produce more reliable scores as all 8 signals have more data to analyze." },
                { title: "English Prose Works Best", desc: "The detector is optimized for English prose. Technical docs or code may give skewed results." },
                { title: "Use as a Guide", desc: "No AI detector is 100% accurate. Use results alongside your own judgment and context." },
                { title: "Check Per-Signal Scores", desc: "Review individual signal breakdowns to understand what exactly triggered the AI flag." },
              ].map((tip) => (
                <div key={tip.title} className="flex gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-orange-500/20 transition-colors duration-200">
                  <span className="w-1.5 h-6 rounded-full bg-linear-to-b from-orange-500 to-rose-500 shrink-0 mt-0.5" />
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4 uppercase tracking-wider">
              FAQ
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-3">
              Everything you need to know about our AI content detector.
            </p>
          </div>

          <div className="space-y-3">
            {toolConfig.faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-orange-500/20 transition-colors duration-200"
              >
                <summary className="flex items-center justify-between gap-3 px-6 py-4 cursor-pointer list-none font-semibold text-foreground text-sm hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
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

    </>
  );
}
