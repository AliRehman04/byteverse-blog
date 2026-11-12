import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, CircleCheck, CircleX, Code, Download, Eye, Maximize2, Save, Share2,
  ShieldCheck, Smartphone, SquareTerminal, WandSparkles,
} from "lucide-react";
import { staticPreview } from "@/lib/html-playground";
import { HtmlEditorTool } from "./html-editor-tool";
import { TEMPLATES } from "./templates";
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
    "Separate HTML, CSS and JavaScript tabs, or one pasted page",
    "Syntax highlighting, find and replace, and Prettier formatting",
    "Console for console.log output, warnings and errors with line numbers",
    "Full screen mode and desktop, tablet, phone and custom preview widths",
    "Autosave in your browser, share by link, download index.html or a ZIP",
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
        "Yes. With Auto-run on, the preview re-renders about 150 milliseconds after you stop typing. Turn Auto-run off to edit freely and press Run, or Ctrl Enter, when you want to see the result.",
    },
    {
      question: "How do I use the HTML editor in full screen?",
      answer:
        "Select Full screen in the toolbar. The editor and preview fill the window, and Esc returns to the page. Inside the code area, the first Esc releases the Tab key so you can move focus; a second Esc leaves full screen.",
    },
    {
      question: "Can I preview my HTML at phone width?",
      answer:
        "Yes. The preview width switch offers Desktop, 768 pixels for tablets, 375 pixels for phones, a landscape rotation and a custom width. The page always renders at the chosen viewport width; when the pane is narrower than that, the frame is scaled down so the whole layout stays visible.",
    },
    {
      question: "Is my code saved or sent anywhere?",
      answer:
        "Your code is saved only in this browser's local storage so a refresh does not lose it; the next visit offers to restore it. It is never sent to a server. Use Download to keep a standalone index.html file, or Reset editor in the More menu to clear the saved copy.",
    },
    {
      question: "Can I write CSS and JavaScript in separate tabs?",
      answer:
        "Yes. The CSS tab is added to the page as a style block and the JS tab as a script at the end of the body. You can also keep everything in the HTML tab: a complete page with its own style and script tags works as it is.",
    },
    {
      question: "Can I use JavaScript and external libraries in the preview?",
      answer:
        "Yes. Scripts run inside a sandboxed frame that can load libraries from a CDN, show alerts and submit forms, but cannot read this site's cookies or navigate the page. console.log output and JavaScript errors appear in the console under the preview with the tab and line number.",
    },
    {
      question: "How does the share link work?",
      answer:
        "Share compresses your code and places it in the part of the address after the # sign, which browsers do not send to servers. Anyone who opens the link sees the code, and it runs only after they press Run. Very large projects do not fit in a link; download those instead.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const editorFeatures = [
  { icon: Code, title: "HTML, CSS and JS tabs", desc: "Keep markup, styles and scripts in separate tabs, or paste a complete page into the HTML tab. The preview combines them." },
  { icon: Eye, title: "Live preview as you type", desc: "The page re-renders moments after each keystroke. Turn Auto-run off and press Run when you want to finish a block first." },
  { icon: SquareTerminal, title: "Console with line numbers", desc: "console.log output, warnings, errors and unhandled promise rejections appear under the preview with the tab and line they came from." },
  { icon: Smartphone, title: "Phone, tablet and custom widths", desc: "Render at 375px, 768px, landscape or any width you type. Wide viewports are scaled to fit, so you see the real layout." },
  { icon: WandSparkles, title: "Highlighting and formatting", desc: "Colour-coded code, bracket matching, find and replace, and one-click formatting with Prettier." },
  { icon: Share2, title: "Share by link", desc: "Copy a link that carries the code inside the address itself. Nothing is stored on a server, and shared code waits for Run." },
  { icon: Download, title: "Download HTML or a ZIP", desc: "Export one index.html, or a ZIP with index.html, styles.css and script.js that opens in any editor." },
  { icon: Save, title: "Autosave and restore", desc: "Your work stays in this browser. A refresh or a return visit offers to restore the last session." },
  { icon: Maximize2, title: "Full screen and resizable panes", desc: "Fill the window with one click, drag the divider between code and preview, or stack them." },
];

const steps = [
  { title: "Write or paste your code", detail: "Use the HTML, CSS and JS tabs, paste a complete page, import your own files, or start from one of seven templates." },
  { title: "Watch it render", detail: "The sandboxed preview updates as you type. Switch to phone or tablet width, and read the console when a script fails." },
  { title: "Save or share", detail: "Download index.html or a ZIP, copy a share link, or come back later: your work is kept in this browser." },
];

const shortcuts = [
  { keys: ["Tab"], action: "Indent the line or selection" },
  { keys: ["Esc", "Tab"], action: "Leave the editor and move focus" },
  { keys: ["Ctrl", "Enter"], action: "Run the code (⌘ Enter on Mac)" },
  { keys: ["Ctrl", "S"], action: "Download index.html (⌘ S on Mac)" },
  { keys: ["Ctrl", "F"], action: "Find and replace in the current tab" },
  { keys: ["Esc"], action: "Leave full screen" },
];

const sandboxNotes = [
  "Scripts run, forms submit, alerts and new windows work, and libraries can load from a CDN link.",
  "The preview cannot read this site's cookies or storage, and it cannot navigate the page you are on.",
  "ByteVerse does not upload your code. Code you write can still make its own requests, for example a CDN script or a fetch call.",
  "A shared link opens with the code paused. It runs only after the person who opened it presses Run.",
  "Very heavy scripts can slow the preview; turn Auto-run off and use Run while you work on them.",
];

const goodFit = [
  "Testing a snippet from a tutorial, a forum answer or an AI assistant before you use it.",
  "Learning HTML, CSS and JavaScript with instant feedback.",
  "Checking how a layout behaves at phone and tablet widths.",
  "Sending a small demo or a bug reproduction to someone as a link.",
];

const poorFit = [
  "Projects with many files, folders or a build step belong in a desktop editor such as VS Code.",
  "Frameworks that need npm packages or a bundler will not run here.",
  "Anything that needs a server, a database or secret keys.",
  "Editing with a team at the same time: there are no accounts or shared sessions.",
];

// The shared Related Tools block under this page already links the Flexbox and Markdown tools.
const relatedTools = [
  { href: "/tools/code-formatter", title: "Code Formatter", desc: "Beautify HTML, CSS and JS" },
  { href: "/tools/css-gradient-generator", title: "CSS Gradient Generator", desc: "Build gradients visually" },
];

const relatedGuides = [
  { href: "/blog/how-to-learn-programming-2026-beginner-roadmap", title: "How to Learn Programming: Beginner Roadmap" },
  { href: "/blog/javascript-roadmap-2026-beginner-job-ready", title: "JavaScript Roadmap: Beginner to Job Ready" },
  { href: "/blog/build-portfolio-website-2026", title: "Build a Portfolio Website: Developer Guide" },
  { href: "/blog/tailwind-css-4-guide-2026", title: "Tailwind CSS 4 Guide: What's New" },
];

// Thumbnails render a script-free copy of each template, so nothing runs in the gallery.
const templateCards = Object.entries(TEMPLATES).map(([key, template]) => ({
  key,
  label: template.label,
  description: template.description,
  preview: staticPreview(template.code),
}));

const sectionHeading = "text-2xl font-semibold tracking-tight text-balance sm:text-3xl";
const sectionLead = "mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function HtmlEditorPage() {
  return (
    <main className="relative isolate mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 md:pb-24 md:pt-8 lg:px-8">
      <ToolJsonLd config={toolConfig} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        style={{
          backgroundImage:
            "radial-gradient(55% 100% at 50% 0%, color-mix(in srgb, var(--primary) 13%, transparent), transparent), linear-gradient(to right, color-mix(in srgb, var(--foreground) 5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 5%, transparent) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 44px 44px, 44px 44px",
          maskImage: "radial-gradient(75% 100% at 50% 0%, black 25%, transparent)",
        }}
      />

      <header className="mb-6 grid gap-6 md:mb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> Free · No sign-up · Runs in your browser
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">Live HTML Editor Online with Instant Preview</h1>
          <p className="mt-3 text-base font-medium text-foreground sm:text-lg">Write code. See results. Build faster.</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Write HTML, CSS and JavaScript in separate tabs, or paste a whole page, and watch it render in real time. Check phone and
            tablet widths, read the console, format the code, then download it or share a link. ByteVerse never uploads your code.
          </p>
        </div>
        <ul className="hidden grid-cols-2 gap-x-8 gap-y-2.5 text-sm font-medium lg:grid">
          {["HTML, CSS and JS tabs", "Console with line numbers", "Share by link", "HTML and ZIP export"].map((item) => (
            <li key={item} className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> {item}</li>
          ))}
        </ul>
      </header>

      <HtmlEditorTool />

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <a href="#html-editor-features" className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 font-medium text-foreground underline-offset-4 hover:underline ${focusRing}`}>
          See everything the editor does <ChevronDown size={14} aria-hidden="true" />
        </a>
      </p>

      <section className="mt-14 scroll-mt-24 md:mt-20" id="html-editor-features" aria-labelledby="html-editor-features-title">
        <h2 id="html-editor-features-title" className={sectionHeading}>Built for live editing, not just viewing</h2>
        <p className={sectionLead}>
          An HTML viewer shows you a page. This editor lets you change it, test it at different widths and find the script error, all without a server.
        </p>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {editorFeatures.map((feature) => (
            <div key={feature.title} className="bg-card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
                <feature.icon size={18} className="text-primary" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 md:mt-24" aria-labelledby="html-editor-steps">
        <h2 id="html-editor-steps" className={sectionHeading}>How to run HTML online in three steps</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
          {steps.map((item, index) => (
            <li key={item.title} className="border-t-2 border-primary pt-5">
              <span className="font-mono text-sm font-semibold text-primary" aria-hidden="true">0{index + 1}</span>
              <h3 className="mt-2 text-base font-semibold sm:text-lg">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 md:mt-24" aria-labelledby="html-editor-templates">
        <h2 id="html-editor-templates" className={sectionHeading}>Start from a template</h2>
        <p className={sectionLead}>Each template loads into the HTML, CSS and JS tabs, ready to edit. Loading one replaces the code in the editor.</p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {templateCards.map((card) => (
            <li key={card.key} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="h-36 overflow-hidden border-b border-border bg-white" aria-hidden="true" inert>
                <iframe
                  srcDoc={card.preview}
                  sandbox=""
                  scrolling="no"
                  loading="lazy"
                  tabIndex={-1}
                  title={`${card.label} template preview`}
                  className="pointer-events-none h-[288px] w-[200%] max-w-none origin-top-left scale-50 border-0 sm:h-[480px] sm:w-[333.34%] sm:scale-[0.3]"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-semibold">{card.label}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                <a
                  href={`#template=${card.key}`}
                  aria-label={`Load the ${card.label} template`}
                  className={`mt-3 inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline ${focusRing}`}
                >
                  Load template <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 grid gap-10 md:mt-24 lg:grid-cols-2 lg:gap-12" aria-label="Keyboard shortcuts and sandbox rules">
        <div>
          <h2 className={sectionHeading}>Keyboard shortcuts</h2>
          <p className={sectionLead}>Tab indents your code, and Esc always gives the keyboard a way out of the editor.</p>
          <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.action} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">{shortcut.action}</dt>
                <dd className="flex shrink-0 items-center gap-1.5">
                  {shortcut.keys.map((key, index) => (
                    <span key={key} className="flex items-center gap-1.5">
                      {index > 0 && <span className="text-xs text-muted-foreground">then</span>}
                      <kbd className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs font-medium text-foreground">{key}</kbd>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className={sectionHeading}>What the sandbox allows</h2>
          <p className={sectionLead}>The preview runs in an iframe with a restricted sandbox. That keeps the page you are on safe and sets a few limits worth knowing.</p>
          <ul className="mt-6 grid gap-3.5">
            {sandboxNotes.map((note) => (
              <li key={note} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> {note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-16 md:mt-24" aria-labelledby="html-editor-fit">
        <h2 id="html-editor-fit" className={sectionHeading}>Online HTML editor or a desktop code editor?</h2>
        <p className={sectionLead}>A browser editor is the quickest way to try an idea. It is not a replacement for a full development setup.</p>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
          <div className="bg-card p-6">
            <h3 className="text-base font-semibold">Use this editor for</h3>
            <ul className="mt-4 grid gap-3">
              {goodFit.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                  <CircleCheck size={17} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card p-6">
            <h3 className="text-base font-semibold">Use something else for</h3>
            <ul className="mt-4 grid gap-3">
              {poorFit.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                  <CircleX size={17} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-8 md:mt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12" aria-labelledby="html-editor-faq">
        <div>
          <h2 id="html-editor-faq" className={sectionHeading}>Frequently asked questions</h2>
          <p className={sectionLead}>Short answers about rendering, saving, sharing and what the preview can do.</p>
        </div>
        <div className="border-t border-border">
          {toolConfig.faqs.map((faq, index) => (
            <details key={faq.question} open={index === 0} className="group border-b border-border">
              <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden ${focusRing}`}>
                <h3 className="text-sm font-semibold sm:text-base">{faq.question}</h3>
                <ChevronDown size={18} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-16 md:mt-24" aria-labelledby="html-editor-related">
        <h2 id="html-editor-related" className={sectionHeading}>Keep building</h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Related guides</h3>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {relatedGuides.map((guide) => (
                <li key={guide.href}>
                  <Link href={guide.href} className={`group flex min-h-[52px] items-center gap-3 py-3 text-sm font-medium text-foreground transition-colors hover:text-primary ${focusRing}`}>
                    <BookOpen size={16} className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" /> {guide.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">More free tools for front-end work</h3>
            <ul className="mt-4 grid gap-4">
              {relatedTools.map((tool) => (
                <li key={tool.href}>
                  <Link href={tool.href} className={`group flex h-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 ${focusRing}`}>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{tool.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{tool.desc}</span>
                    </span>
                    <ArrowUpRight size={16} className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
