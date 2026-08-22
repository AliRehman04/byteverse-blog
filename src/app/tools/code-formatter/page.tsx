import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, Braces, FileCode, Database, Code2, Paintbrush, FileText } from "lucide-react";
import { CodeFormatterTool } from "./code-formatter-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Code Formatter & Beautifier",
  title: "Code Formatter Online - JSON, HTML, CSS, JS & SQL",
  description: "Free online code formatter and beautifier: format or minify JSON, HTML, CSS, JavaScript, SQL, and XML instantly with auto language detection. No sign-up.",
  slug: "code-formatter",
  keywords: [
    "code formatter",
    "code formatter online",
    "online code formatter",
    "code beautifier",
    "code beautifier online",
    "code prettifier tool",
    "format code online",
    "code formatter html",
    "json formatter",
    "html formatter",
    "css formatter",
    "javascript formatter",
    "sql formatter",
    "code minifier",
  ],
  featureList: [
    "Format and beautify 6 languages",
    "One-click minify",
    "Automatic language detection",
    "2 or 4 space indentation",
    "Runs fully in your browser",
  ],
  faqs: [
    {
      question: "How do I format code online for free?",
      answer: "Paste your code above — the tool auto-detects whether it is JSON, HTML, CSS, JavaScript, SQL, or XML, formats it with your chosen indentation, and copies the clean result in one click. Free, no sign-up, no limits.",
    },
    {
      question: "What languages does this code formatter support?",
      answer: "JSON, HTML, CSS, JavaScript, SQL, and XML — covering the formats developers most often need to clean up quickly outside an IDE.",
    },
    {
      question: "Is my code safe?",
      answer: "Yes. All formatting runs 100% in your browser — no code is uploaded, stored, or sent to any server, which makes it safe for proprietary and client code.",
    },
    {
      question: "Can I minify code too?",
      answer: "Yes. The Minify button compresses code by stripping whitespace, comments, and unnecessary characters — the reverse of formatting, useful for production payloads.",
    },
    {
      question: "Should I use 2 or 4 spaces for indentation?",
      answer: "Both are valid — 2 spaces dominates modern JavaScript/web projects (and this site's code), while 4 remains common in SQL and enterprise codebases. Consistency within a project matters more than the number.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const languages = [
  { icon: Braces, title: "JSON", desc: "Format, validate, and minify JSON data — the everyday cleanup for API responses and configs." },
  { icon: FileCode, title: "HTML", desc: "Beautify markup with proper tag indentation — untangle exported or minified pages." },
  { icon: Paintbrush, title: "CSS", desc: "Clean property alignment and consistent braces for stylesheets." },
  { icon: Code2, title: "JavaScript", desc: "Indent JS with brace matching — readable code from minified bundles." },
  { icon: Database, title: "SQL", desc: "Uppercase keywords and indented clauses — turn one-line queries into readable statements." },
  { icon: FileText, title: "XML", desc: "Proper nesting for config files, sitemaps, and feeds." },
];

export default function CodeFormatterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free Developer Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Code Formatter & Beautifier Online
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Format, beautify, or minify code online — JSON, HTML, CSS, JavaScript, SQL, and XML with
          automatic language detection. Paste messy code, get clean readable output, copy in one
          click. Free and private.
        </p>
      </div>

      <CodeFormatterTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Format Code Online in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Paste your code", detail: "The tool auto-detects JSON, HTML, CSS, SQL, or XML — or pick the language manually from the dropdown." },
            { step: "Format or minify", detail: "Format beautifies with your chosen indent (2 or 4 spaces); Minify compresses for production payloads." },
            { step: "Copy the result", detail: "One click copies clean output — ready for your editor, code review, or documentation." },
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

      {/* Languages */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">6 Languages, One Formatter</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            The formats developers most often need to clean up fast — no IDE required.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {languages.map((lang) => (
            <div key={lang.title} className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <lang.icon size={18} className="text-primary" />
                </span>
                <h3 className="font-bold text-sm sm:text-base">{lang.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{lang.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Format vs minify */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Format vs Minify: When to Use Which</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold">Action</th>
                <th className="p-3.5 font-bold">What it does</th>
                <th className="p-3.5 font-bold">Use it for</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="p-3.5 font-semibold text-foreground">Format</td>
                <td className="p-3.5">Adds indentation and line breaks for readability</td>
                <td className="p-3.5">Debugging, code review, learning, documentation</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-foreground">Minify</td>
                <td className="p-3.5">Strips whitespace and comments for size</td>
                <td className="p-3.5">Production payloads, faster page loads, embeds</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-4">
          Rule of thumb: humans read formatted code, machines ship minified code. Formatting a
          minified production bundle is also the fastest way to inspect what a site actually ships —
          a trick worth knowing for debugging and{" "}
          <Link href="/blog/website-speed-optimization-checklist-2026-core-web-vitals" className="text-primary hover:underline">page speed work</Link>.
        </p>
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">More Developer Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/json-formatter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JSON Formatter — dedicated JSON workspace</Link></li>
              <li><Link href="/tools/html-editor" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> HTML Editor — live preview playground</Link></li>
              <li><Link href="/tools/regex-tester" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Regex Tester — test patterns live</Link></li>
              <li><Link href="/tools/diff-checker" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Diff Checker — compare two code blocks</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/best-vscode-extensions-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 20 Best VS Code Extensions</Link></li>
              <li><Link href="/blog/javascript-roadmap-2026-beginner-job-ready" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JavaScript Roadmap: Beginner to Job Ready</Link></li>
              <li><Link href="/blog/git-github-beginners-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Git & GitHub for Beginners</Link></li>
              <li><Link href="/blog/typescript-for-beginners-2026-complete-guide" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> TypeScript for Beginners</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
