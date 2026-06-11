import type { Metadata } from "next";
import Link from "next/link";
import { PlagiarismRemoverTool } from "./plagiarism-remover-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import {
  ShieldCheck, Shuffle, Quote, Monitor, SlidersHorizontal, Zap,
  ClipboardPaste, Settings2, MousePointerClick,
  FileSearch, Bot, Type, AudioLines,
  ChevronDown,
} from "lucide-react";

const toolConfig = {
  name: "Plagiarism Remover & AI Humanizer",
  title: "Free Plagiarism Remover & AI Humanizer â€” Rewrite Text Online",
  description:
    "Remove plagiarism and humanize AI-generated text instantly. Replaces AI phrases, swaps synonyms, adds contractions, and makes content unique. 100% free, private, client-side tool.",
  slug: "plagiarism-remover",
  keywords: [
    "plagiarism remover",
    "ai humanizer",
    "text rewriter",
    "remove plagiarism",
    "humanize ai text",
    "paraphrasing tool",
    "rewrite text online",
    "remove ai detection",
    "make text unique",
    "free plagiarism remover online",
    "ai text humanizer free",
    "plagiarism rewriter tool",
    "bypass ai detection",
    "undetectable ai text",
  ],
  faqs: [
    {
      question: "How does the plagiarism remover work?",
      answer:
        "The tool uses three strategies: it replaces 55+ common AI phrases with human-sounding alternatives, swaps 150+ words with contextual synonyms, and adds natural contractions. A strength slider controls how aggressively the text is rewritten.",
    },
    {
      question: "Will this remove AI detection?",
      answer:
        "The tool targets specific patterns that AI detectors look for â€” formulaic transitions, overused phrases, lack of contractions, and robotic vocabulary. At medium-to-heavy strength, it significantly reduces AI detection scores. For best results, also manually edit the output to add your own voice.",
    },
    {
      question: "Is my text safe and private?",
      answer:
        "Yes. All rewriting happens entirely in your browser using JavaScript. No text is uploaded, stored, or sent to any server. Your content never leaves your device.",
    },
    {
      question: "Can I edit the rewritten text?",
      answer:
        "Yes. The output is fully editable. You can fine-tune the rewritten text, then use our Plagiarism Checker or AI Content Detector to verify the results.",
    },
    {
      question: "What is the difference between Light, Medium, and Heavy?",
      answer:
        "Light makes subtle changes â€” mainly contractions and a few key phrase replacements. Medium applies all three transformation layers at a balanced rate. Heavy aggressively rewrites the text, replacing more words and phrases for maximum uniqueness.",
    },
    {
      question: "Is this tool completely free?",
      answer:
        "Yes, 100% free with no signup, no credit card, and no usage limits. All processing happens locally in your browser so we have zero server costs to pass on.",
    },
  ],
};

const features = [
  {
    icon: ShieldCheck,
    title: "AI Phrase Removal",
    desc: "Replaces 55+ formulaic phrases commonly used by AI models with natural, human-sounding alternatives.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Shuffle,
    title: "Synonym Swapping",
    desc: "Swaps 150+ overused words with contextual synonyms. The strength slider controls how aggressively.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Quote,
    title: "Contraction Injection",
    desc: 'Converts "it is" to "it\'s", "do not" to "don\'t" â€” one of the fastest ways to humanize text.',
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Monitor,
    title: "100% Client-Side",
    desc: "Your text never leaves your browser. No servers, no data collection, no privacy concerns whatsoever.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: SlidersHorizontal,
    title: "Adjustable Strength",
    desc: "From light touch-ups to heavy rewrites. Dial in the exact level of transformation you need.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Zap,
    title: "Instant Results",
    desc: "Get your rewritten text in seconds. No waiting, no queues, no signups required to start using it.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

const steps = [
  {
    num: "01",
    icon: ClipboardPaste,
    title: "Paste Your Text",
    desc: "Copy any text â€” AI-generated, academic, or web content â€” and paste it into the input box.",
  },
  {
    num: "02",
    icon: Settings2,
    title: "Adjust Settings",
    desc: "Choose your rewrite strength and toggle which transformations to apply: AI phrase removal, synonym swap, and contractions.",
  },
  {
    num: "03",
    icon: MousePointerClick,
    title: "Get Results",
    desc: "Click Rewrite and get your humanized, unique text in seconds. Copy, edit, or regenerate as needed.",
  },
];

const relatedTools = [
  {
    icon: FileSearch,
    title: "Plagiarism Checker",
    desc: "Scan text for duplicate content across the web",
    href: "/tools/plagiarism-checker",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Bot,
    title: "AI Content Detector",
    desc: "Check if text was written by ChatGPT or other AI",
    href: "/tools/ai-content-detector",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
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

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function PlagiarismRemoverPage() {
  const stats = [
    { value: "55+", label: "AI Phrases Detected" },
    { value: "150+", label: "Synonyms Replaced" },
    { value: "100%", label: "Client-Side Private" },
    { value: "< 1s", label: "Processing Time" },
  ];

  return (
    <>
      <ToolJsonLd config={toolConfig} />

      {/* â”€â”€ Hero Banner (About-page style) â”€â”€ */}
      <section className="hero-bg relative overflow-hidden bg-linear-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-emerald-300 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Free &middot; No Signup Required
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
              Make AI Text Sound<br className="hidden sm:block" />
              <span className="bg-linear-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">Undeniably Human</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mb-8">
              Paste AI-generated or flagged text below. Our tool rewrites it to remove robotic
              patterns and plagiarism markers â€” entirely in your browser, with zero data collection.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
          </svg>
        </div>
      </section>

      {/* â”€â”€ Tool Section â”€â”€ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <PlagiarismRemoverTool />
      </section>

      {/* â”€â”€ Stats Bar â”€â”€ */}
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

      {/* â”€â”€ Features Grid â”€â”€ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-xs font-semibold text-violet-500 dark:text-violet-400 mb-4 uppercase tracking-wider">
            Core Features
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Everything You Need to<br className="hidden sm:block" /> Make Text Uniquely Yours
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mt-3 max-w-2xl mx-auto">
            Three powerful transformation layers working together to remove AI fingerprints and plagiarism from your content.
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

      {/* â”€â”€ How It Works â”€â”€ */}
      <section className="relative overflow-hidden bg-linear-to-b from-muted/50 to-background border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs font-semibold text-blue-500 dark:text-blue-400 mb-4 uppercase tracking-wider">
              How It Works
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Plagiarism-Free in 3 Simple Steps
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-3 max-w-lg mx-auto">
              No complicated setup, no learning curve. Just paste, tweak, and rewrite.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connecting line between steps (desktop) */}
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

      {/* â”€â”€ SEO Content â”€â”€ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-5">
              Why Use a Plagiarism Remover?
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                Whether you are polishing an academic paper, rewriting blog content, or humanizing AI-generated drafts from <Link href="/blog/10-best-free-ai-tools-in-2026-that-will-blow-your-mind" className="text-primary hover:underline">ChatGPT or Claude</Link>, a plagiarism remover helps you produce original text that reads naturally. Search engines and academic institutions increasingly penalize duplicate and AI-patterned content, making paraphrasing tools essential for writers, students, and marketers.
              </p>
              <p>
                ByteVerse&apos;s plagiarism remover goes beyond simple word swapping. It uses three distinct transformation layers â€” AI phrase removal, contextual synonym replacement, and contraction injection â€” to rewrite text in a way that passes both plagiarism scanners and <Link href="/tools/ai-content-detector" className="text-primary hover:underline">AI content detectors</Link>. The adjustable strength slider gives you complete control over how aggressively your text is rewritten.
              </p>
              <p>
                After rewriting, we recommend verifying your output with our <Link href="/tools/plagiarism-checker" className="text-primary hover:underline">Plagiarism Checker</Link> to ensure uniqueness and running it through the <Link href="/tools/word-counter" className="text-primary hover:underline">Word Counter</Link> to confirm your content meets length requirements. For content creation workflows, pair this tool with the <Link href="/tools/ai-prompt-generator" className="text-primary hover:underline">AI Prompt Generator</Link> to draft initial content and the <Link href="/tools/code-formatter" className="text-primary hover:underline">Code Formatter</Link> for any technical snippets.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Tips for Best Results</h3>
            <div className="space-y-3">
              {[
                { title: "Start at Medium", desc: "50% strength gives a balanced rewrite that preserves meaning while making text unique." },
                { title: "Use Heavy for AI text", desc: "AI-generated content needs more aggressive rewriting â€” try 70%+ strength for best results." },
                { title: "Always review output", desc: "Add your personal voice and style after rewriting for the most natural-sounding result." },
                { title: "Verify with detectors", desc: "Run rewritten text through our AI Content Detector and Plagiarism Checker to confirm." },
                { title: "Combine with manual edits", desc: "The best results come from pairing automated rewriting with your own revisions." },
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

      {/* â”€â”€ FAQ Accordion â”€â”€ */}
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
              Everything you need to know about our plagiarism remover tool.
            </p>
          </div>

          <div className="space-y-3">
            {toolConfig.faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-violet-500/20 transition-colors duration-200"
              >
                <summary className="flex items-center justify-between gap-3 px-6 py-4.5 cursor-pointer list-none font-semibold text-foreground text-sm hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
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

      {/* â”€â”€ Related Tools â”€â”€ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Related Tools
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mt-3">
            Pair these tools with the plagiarism remover for a complete content workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {relatedTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative overflow-hidden p-6 rounded-2xl border border-border bg-card hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-violet-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className={`relative w-12 h-12 rounded-xl ${tool.bg} flex items-center justify-center mb-4 ring-1 ring-inset ring-black/5 dark:ring-white/5`}>
                <tool.icon size={22} className={tool.color} />
              </div>
              <h3 className="relative font-bold text-foreground mb-1.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{tool.title}</h3>
              <p className="relative text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
