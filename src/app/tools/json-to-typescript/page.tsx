import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, Braces, Layers, ListChecks, Lock, Download, FileCode } from "lucide-react";
import { JsonToTypeScriptTool } from "./json-to-typescript-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "JSON to TypeScript Converter",
  title: "JSON to TypeScript Converter - Interface & Type Online",
  description: "Convert JSON to TypeScript interfaces or types online, free. Handles nested objects, arrays, optional props, readonly, and exports — 100% in your browser.",
  slug: "json-to-typescript",
  keywords: [
    "json to typescript",
    "json to typescript interface",
    "json to typescript type",
    "json to typescript converter",
    "json to typescript online",
    "json to typescript type generator",
    "json to ts",
    "json to types",
    "json to interface",
    "json to interface typescript",
    "generate typescript types from json",
    "typescript interface generator",
    "typescript from json",
  ],
  featureList: [
    "Interface or type alias output",
    "Nested objects to separate interfaces",
    "Array and union type inference",
    "Optional, readonly, and export modifiers",
    ".d.ts download and file upload",
  ],
  faqs: [
    {
      question: "How do I convert JSON to a TypeScript interface online?",
      answer: "Paste your JSON above — the converter detects each field's type, extracts nested objects into named interfaces, and outputs copy-ready TypeScript instantly. Free, no sign-up, runs in your browser.",
    },
    {
      question: "Should I generate an interface or a type from JSON?",
      answer: "Both describe the same shape. Interfaces support declaration merging and extend cleanly — the common default for object shapes. Type aliases handle unions and mapped types better. The toggle outputs either style.",
    },
    {
      question: "Can it handle nested JSON objects?",
      answer: "Yes. Nested objects become separate named interfaces automatically — an 'address' object field generates its own 'Address' interface, keeping output clean and reusable.",
    },
    {
      question: "Does it support JSON arrays and mixed types?",
      answer: "Yes. Arrays of objects merge every item's keys into one complete interface, and mixed-type arrays infer union types like (string | number)[].",
    },
    {
      question: "Is my JSON data safe?",
      answer: "Completely. Conversion runs 100% in your browser — no JSON is uploaded, stored, or sent to any server, so API responses and proprietary data stay private.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const capabilities = [
  { icon: Layers, title: "Nested Object Extraction", desc: "Every nested object becomes its own named interface — clean, reusable, production-style output." },
  { icon: Braces, title: "Array & Union Inference", desc: "Arrays of objects merge all keys; mixed arrays produce union types like (string | number)[]." },
  { icon: ListChecks, title: "Interface or Type Toggle", desc: "Output interface declarations or type aliases — whichever your codebase standardizes on." },
  { icon: FileCode, title: "Modifiers & Naming", desc: "Optional properties, readonly fields, export keywords, and a custom root name — all toggleable." },
  { icon: Download, title: "Upload & Download", desc: "Upload a .json file and download the result as a ready-to-import .d.ts file." },
  { icon: Lock, title: "100% Client-Side", desc: "Your JSON never leaves the browser — safe for API responses and internal data." },
];

export default function JsonToTypeScriptPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free Developer Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">JSON to TypeScript Converter — Interfaces & Types</h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Generate TypeScript interfaces or types from any JSON online — nested objects, arrays,
          optional and readonly props handled automatically. Paste JSON, copy production-ready
          types, ship faster.
        </p>
      </div>

      <JsonToTypeScriptTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Generate TypeScript Types from JSON</h2>
        <ol className="grid gap-4">
          {[
            { step: "Paste or upload your JSON", detail: "An API response, config file, or any valid JSON object or array — the parser validates as you paste." },
            { step: "Pick your output style", detail: "Interface or type alias, optional props, readonly modifiers, export keyword, and a custom root name." },
            { step: "Copy or download the types", detail: "Copy the generated code straight into your project or download it as a .d.ts declaration file." },
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

      {/* Example */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Example: JSON In, Interfaces Out</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/50"><h3 className="font-bold text-sm">Input JSON</h3></div>
            <pre className="p-5 text-xs sm:text-sm font-mono text-muted-foreground overflow-x-auto">{`{
  "id": 42,
  "name": "Ada",
  "verified": true,
  "address": {
    "city": "Lahore",
    "zip": "54000"
  },
  "tags": ["admin", "dev"]
}`}</pre>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/50"><h3 className="font-bold text-sm">Generated TypeScript</h3></div>
            <pre className="p-5 text-xs sm:text-sm font-mono text-muted-foreground overflow-x-auto">{`export interface Address {
  city: string;
  zip: string;
}

export interface Root {
  id: number;
  name: string;
  verified: boolean;
  address: Address;
  tags: string[];
}`}</pre>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">What the Converter Handles</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            The edge cases that make hand-writing types tedious — automated.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((cap) => (
            <div key={cap.title} className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <cap.icon size={18} className="text-primary" />
                </span>
                <h3 className="font-bold text-sm sm:text-base">{cap.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interface vs type */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Interface vs Type: Which Should You Generate?</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold"></th>
                <th className="p-3.5 font-bold">interface</th>
                <th className="p-3.5 font-bold">type</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">Best for</td><td className="p-3.5">Object shapes, public APIs</td><td className="p-3.5">Unions, intersections, mapped types</td></tr>
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">Declaration merging</td><td className="p-3.5">Yes</td><td className="p-3.5">No</td></tr>
              <tr className="border-b border-border"><td className="p-3.5 font-semibold text-foreground">Extending</td><td className="p-3.5">extends keyword</td><td className="p-3.5">& intersection</td></tr>
              <tr><td className="p-3.5 font-semibold text-foreground">JSON-derived shapes</td><td className="p-3.5">Great default</td><td className="p-3.5">Equally valid</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-4">
          For JSON-derived object shapes, both work identically in practice — pick whichever your
          codebase already uses and stay consistent. The full mental model is in our{" "}
          <Link href="/blog/typescript-for-beginners-2026-complete-guide" className="text-primary hover:underline">TypeScript beginner guide</Link>.
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
              <li><Link href="/tools/json-formatter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JSON Formatter — format and validate first</Link></li>
              <li><Link href="/tools/json-to-csv" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JSON to CSV — tabular exports</Link></li>
              <li><Link href="/tools/code-formatter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Code Formatter — beautify any snippet</Link></li>
              <li><Link href="/tools/jwt-decoder" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JWT Decoder — inspect token payloads</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/typescript-for-beginners-2026-complete-guide" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> TypeScript for Beginners: Complete Guide</Link></li>
              <li><Link href="/blog/react-19-best-practices-2026-faster-apps" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> React 19 Best Practices</Link></li>
              <li><Link href="/blog/best-free-apis-for-developers-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 30 Best Free APIs (to practice typing!)</Link></li>
              <li><Link href="/blog/best-vscode-extensions-2026-web-developers" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 25 Best VS Code Extensions</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
