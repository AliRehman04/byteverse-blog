import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, Eye, Smartphone, Download, Layers, ListChecks, Maximize2 } from "lucide-react";
import { HtmlEditorTool } from "./html-editor-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Live HTML Editor",
  title: "HTML Editor Online - Free, with Live Preview",
  description:
    "Free online HTML editor with live preview — write HTML, CSS, and JavaScript and see results instantly. 7 templates, mobile preview, fullscreen. No sign-up.",
  slug: "html-editor",
  keywords: [
    "html editor online",
    "html editor online free",
    "html editor online with preview",
    "html editor online free with preview",
    "live html editor",
    "html editor",
    "run html online",
    "test html online",
    "html playground",
    "online html editor",
    "html css editor",
    "html preview",
    "html css javascript editor",
  ],
  featureList: [
    "Instant live preview while typing",
    "HTML, CSS, and JavaScript support",
    "7 ready-made templates",
    "Mobile preview at 375px",
    "Fullscreen mode and file download",
  ],
  faqs: [
    {
      question: "How do I test HTML code online for free?",
      answer:
        "Type or paste your HTML, CSS, and JavaScript into the editor above — the live preview updates instantly as you type. No account, no install, no limits; you can also start from one of 7 templates.",
    },
    {
      question: "How does the live preview work?",
      answer:
        "As you type, the preview panel re-renders your code in a sandboxed iframe entirely in your browser — no server round-trips, which is why updates are instant and your code stays private.",
    },
    {
      question: "Can I use JavaScript in the editor?",
      answer:
        "Yes. Inline scripts and script tags run inside a sandboxed iframe for security, so they cannot access your browser data or navigate away from the page.",
    },
    {
      question: "Is my code saved or sent anywhere?",
      answer:
        "No. All code stays in your browser — nothing is uploaded or stored on any server. Download your work as a standalone HTML file whenever you want to keep it.",
    },
    {
      question: "How is this different from CodePen or VS Code?",
      answer:
        "It is the zero-setup middle ground: faster than opening an IDE, no account like CodePen requires for saving. Ideal for quick experiments, learning, and testing snippets — graduate to VS Code when projects grow beyond one file.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const editorFeatures = [
  { icon: Eye, title: "Instant Live Preview", desc: "See HTML rendered in real time as you type — the fastest feedback loop for learning and prototyping." },
  { icon: ListChecks, title: "7 Ready Templates", desc: "Starter page, profile card, contact form, CSS grid gallery, navbar, animation, and landing page." },
  { icon: Layers, title: "Split Layouts", desc: "Side-by-side or stacked editor/preview — pick what fits your screen." },
  { icon: Smartphone, title: "Mobile Preview", desc: "One click switches the preview to 375px width to test responsive behavior." },
  { icon: Maximize2, title: "Fullscreen Mode", desc: "Maximize the workspace for distraction-free coding sessions." },
  { icon: Download, title: "Download as HTML", desc: "Export your work as a standalone file — open it in any browser or keep building in an IDE." },
];

export default function HtmlEditorPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free Developer Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          HTML Editor Online — Free, with Live Preview
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Write and test HTML, CSS, and JavaScript online with an instant live preview. Start from 7
          templates or a blank page, check mobile responsiveness, go fullscreen, and download your
          work — all free, right in your browser.
        </p>
      </div>

      <HtmlEditorTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Run HTML Online in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Write or paste your code", detail: "HTML in the editor — with CSS in style tags and JavaScript in script tags — or load one of the 7 templates." },
            { step: "Watch the live preview", detail: "Every keystroke re-renders instantly in the sandboxed preview panel. Toggle mobile width to test responsiveness." },
            { step: "Download or keep iterating", detail: "Export as a standalone .html file, or use fullscreen mode for longer sessions." },
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

      {/* Features */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Everything the Editor Includes</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            A complete HTML/CSS/JS playground — free, private, and fast.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {editorFeatures.map((f) => (
            <div key={f.title} className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon size={18} className="text-primary" />
                </span>
                <h3 className="font-bold text-sm sm:text-base">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">What People Use This Editor For</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
          The zero-setup editor fits anywhere a full IDE is overkill:
        </p>
        <ul className="grid gap-3">
          {[
            "Learning HTML and CSS with instant visual feedback — the fastest way to understand what each tag does",
            "Prototyping layouts and CSS animations before committing them to a real project",
            "Testing email signature and embed snippets safely in a sandbox",
            "Preparing code examples for presentations, tutorials, and documentation",
            "Building small standalone pages — landing pages, profile cards — without a dev environment",
          ].map((useCase) => (
            <li key={useCase} className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground leading-relaxed">
              <ArrowRight size={15} className="text-primary shrink-0 mt-0.5" /> {useCase}
            </li>
          ))}
        </ul>
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Keep Building</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/code-formatter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Code Formatter — beautify HTML, CSS & JS</Link></li>
              <li><Link href="/tools/css-gradient-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> CSS Gradient Generator — visual gradients</Link></li>
              <li><Link href="/tools/flexbox-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Flexbox Generator — layout without guesswork</Link></li>
              <li><Link href="/tools/markdown-to-html" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Markdown to HTML — convert instantly</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/how-to-learn-programming-2026-beginner-roadmap" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Learn Programming: Beginner Roadmap</Link></li>
              <li><Link href="/blog/javascript-roadmap-2026-beginner-job-ready" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JavaScript Roadmap: Beginner to Job Ready</Link></li>
              <li><Link href="/blog/build-portfolio-website-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Build a Portfolio Website: Developer Guide</Link></li>
              <li><Link href="/blog/tailwind-css-4-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Tailwind CSS 4 Guide: What's New</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
