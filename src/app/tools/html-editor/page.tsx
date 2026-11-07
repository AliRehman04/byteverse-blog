import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, Eye, Smartphone, Download, Maximize2, Save, TriangleAlert, Keyboard, ShieldCheck } from "lucide-react";
import { HtmlEditorTool } from "./html-editor-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Live HTML Editor",
  title: "Live HTML Editor Online – Free, with Preview",
  description:
    "Free live HTML editor online: write or paste HTML, CSS and JavaScript and see the preview render as you type. Full screen, phone view, error console, autosave.",
  slug: "html-editor",
  keywords: [
    "live html editor",
    "html editor online with preview",
    "html editor full screen",
    "render html online",
    "real time html editor",
    "online html viewer and editor",
    "free html editor with live preview",
    "html online editor with preview",
    "run html online",
    "test html online",
    "html css javascript editor",
    "html editor online free",
  ],
  featureList: [
    "Live preview that re-renders as you type",
    "HTML, CSS and JavaScript in one file",
    "Full screen mode and desktop, tablet and phone preview widths",
    "Preview error console for JavaScript mistakes",
    "Autosave in your browser and download as index.html",
  ],
  faqs: [
    {
      question: "How do I render HTML online without installing anything?",
      answer:
        "Paste your HTML into the editor above. The preview panel renders it immediately in a sandboxed frame inside your browser, including any CSS in style tags and JavaScript in script tags. Nothing is installed and nothing is uploaded.",
    },
    {
      question: "Is this a real-time HTML editor?",
      answer:
        "Yes. With Auto-update on, the preview re-renders about 150 milliseconds after you stop typing. Turn Auto-update off to edit freely and press Run, or Ctrl Enter, when you want to see the result.",
    },
    {
      question: "How do I use the HTML editor in full screen?",
      answer:
        "Select Full screen in the toolbar. The editor and preview fill the window, and Esc returns to the page. Inside the code area, the first Esc releases the Tab key so you can move focus; a second Esc leaves full screen.",
    },
    {
      question: "Can I preview my HTML at phone width?",
      answer:
        "Yes. The preview width switch offers Desktop, 768 pixels for tablets and 375 pixels for phones. The page always renders at the chosen viewport width; when the pane is narrower than that, the frame is scaled down so the whole layout stays visible.",
    },
    {
      question: "Is my code saved or sent anywhere?",
      answer:
        "Your code is saved only in this browser's local storage so a refresh does not lose it; the next visit offers to restore it. It is never sent to a server. Use Download to keep a standalone index.html file, or Reset to clear the saved copy.",
    },
    {
      question: "Can I use JavaScript and external libraries in the preview?",
      answer:
        "Yes. Scripts run inside a sandboxed frame that can load libraries from a CDN, show alerts and submit forms, but cannot read this site's cookies or navigate the page. JavaScript errors appear in the preview error strip with the line number.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const editorFeatures = [
  { icon: Eye, title: "Live preview as you type", desc: "The rendered page updates moments after each keystroke. Switch Auto-update off and use Run when you want to finish a block of code first." },
  { icon: Maximize2, title: "Full screen editing", desc: "One click fills the window with the editor and preview. Esc brings the page back, and keyboard focus returns to the toolbar." },
  { icon: Smartphone, title: "Desktop, tablet and phone widths", desc: "Render the same code at full width, 768px or 375px to catch layouts that break on small screens." },
  { icon: TriangleAlert, title: "Preview error console", desc: "JavaScript errors, unhandled promise rejections and console.error calls from your code appear under the preview with the line number." },
  { icon: Save, title: "Autosave and restore", desc: "Your code stays in this browser's storage. A refresh or a return visit offers to restore the last session instead of showing a blank page." },
  { icon: Download, title: "Download as index.html", desc: "Export a standalone file you can open in any browser or continue in an editor such as VS Code." },
];

const shortcuts = [
  { keys: "Tab", action: "Insert two spaces at the cursor" },
  { keys: "Esc, then Tab", action: "Release the Tab key and move focus out of the editor" },
  { keys: "Ctrl Enter (⌘ Enter on Mac)", action: "Run the code when Auto-update is off" },
  { keys: "Ctrl S (⌘ S on Mac)", action: "Download index.html" },
  { keys: "Esc in full screen", action: "Leave full screen" },
];

export default function HtmlEditorPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-12">
      <ToolJsonLd config={toolConfig} />

      <header className="mx-auto mb-8 max-w-3xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Free · No sign-up · Runs in your browser</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Live HTML Editor Online with Instant Preview</h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Write or paste HTML, CSS and JavaScript and watch the page render in real time. Test it at phone and tablet widths,
          go full screen, catch script errors, and download the file. Your code never leaves the browser.
        </p>
      </header>

      <HtmlEditorTool />

      <section className="mx-auto mt-16 max-w-3xl md:mt-20" aria-labelledby="html-editor-steps">
        <h2 id="html-editor-steps" className="mb-6 text-center text-2xl font-bold tracking-tight sm:text-3xl">How to run HTML online in three steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Paste or write your code", detail: "Put HTML in the editor with CSS inside style tags and JavaScript inside script tags, or pick one of seven templates: starter page, profile card, contact form, CSS grid gallery, navbar, animation or landing page." },
            { step: "Watch the live preview", detail: "The sandboxed preview re-renders as you type. Switch the width to 768px or 375px to check responsive behaviour, and read the error strip if a script fails." },
            { step: "Download or keep going", detail: "Export a standalone index.html, or use full screen for a longer session. Your work is kept in this browser until you reset it." },
          ].map((item, index) => (
            <li key={item.step} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-extrabold text-primary">{index + 1}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold sm:text-base">{item.step}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-16 max-w-5xl md:mt-20" aria-labelledby="html-editor-features">
        <div className="mb-10 text-center">
          <h2 id="html-editor-features" className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">Built for live editing, not just viewing</h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            An HTML viewer shows you a page. This editor lets you change it, test it at different widths and find the script error, all without a server.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {editorFeatures.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon size={18} className="text-primary" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-bold sm:text-base">{feature.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl md:mt-20" aria-labelledby="html-editor-shortcuts">
        <h2 id="html-editor-shortcuts" className="mb-3 flex items-center justify-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"><Keyboard size={24} className="text-primary" aria-hidden="true" /> Keyboard shortcuts</h2>
        <p className="mb-5 text-center text-sm text-muted-foreground sm:text-base">The editor follows accessibility rules for keyboard traps: Tab indents, but Esc always gives you a way out.</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th scope="col" className="px-5 py-3">Keys</th><th scope="col" className="px-5 py-3">Action</th></tr>
            </thead>
            <tbody>
              {shortcuts.map((shortcut) => (
                <tr key={shortcut.keys} className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs text-foreground">{shortcut.keys}</td>
                  <td className="px-5 py-3 text-muted-foreground">{shortcut.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl md:mt-20" aria-labelledby="html-editor-limits">
        <h2 id="html-editor-limits" className="mb-3 flex items-center justify-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"><ShieldCheck size={24} className="text-primary" aria-hidden="true" /> What the sandbox allows</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          The preview runs in an iframe with a restricted sandbox. That keeps the page you are on safe and sets a few limits worth knowing:
        </p>
        <ul className="grid gap-3">
          {[
            "Scripts run, forms submit, alerts and new windows work, and libraries can load from a CDN link.",
            "The preview cannot read this site's cookies or storage, and it cannot navigate the page you are on.",
            "Everything lives in one file: put CSS in style tags and JavaScript in script tags, or link to hosted files by URL.",
            "Large pages still render, but very heavy scripts can slow the preview; turn Auto-update off and use Run while you work on them.",
            "The editor is for quick testing, learning and prototyping; projects with many files belong in an IDE.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
              <ArrowRight size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-3xl md:mt-20" aria-labelledby="html-editor-faq">
        <h2 id="html-editor-faq" className="mb-6 text-center text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</h2>
        <div className="grid gap-4">
          {toolConfig.faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-1.5 text-sm font-bold sm:text-base">{faq.question}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-5xl md:mt-20" aria-labelledby="html-editor-related">
        <h2 id="html-editor-related" className="mb-6 text-center text-2xl font-bold tracking-tight sm:text-3xl">Keep building</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold sm:text-base"><Wrench size={16} className="text-primary" aria-hidden="true" /> Related free tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/code-formatter" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><ArrowRight size={13} aria-hidden="true" /> Code Formatter: beautify HTML, CSS and JS</Link></li>
              <li><Link href="/tools/css-gradient-generator" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><ArrowRight size={13} aria-hidden="true" /> CSS Gradient Generator: visual gradients</Link></li>
              <li><Link href="/tools/flexbox-generator" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><ArrowRight size={13} aria-hidden="true" /> Flexbox Generator: layout without guesswork</Link></li>
              <li><Link href="/tools/markdown-to-html" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><ArrowRight size={13} aria-hidden="true" /> Markdown to HTML: convert instantly</Link></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold sm:text-base"><BookOpen size={16} className="text-primary" aria-hidden="true" /> Related guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/how-to-learn-programming-2026-beginner-roadmap" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><ArrowRight size={13} aria-hidden="true" /> How to Learn Programming: Beginner Roadmap</Link></li>
              <li><Link href="/blog/javascript-roadmap-2026-beginner-job-ready" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><ArrowRight size={13} aria-hidden="true" /> JavaScript Roadmap: Beginner to Job Ready</Link></li>
              <li><Link href="/blog/build-portfolio-website-2026" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><ArrowRight size={13} aria-hidden="true" /> Build a Portfolio Website: Developer Guide</Link></li>
              <li><Link href="/blog/tailwind-css-4-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><ArrowRight size={13} aria-hidden="true" /> Tailwind CSS 4 Guide: What&apos;s New</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
