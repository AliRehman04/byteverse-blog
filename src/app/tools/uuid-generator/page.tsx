import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, AlertTriangle } from "lucide-react";
import { UuidGeneratorTool } from "./uuid-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "UUID Generator",
  title: "UUID Generator Online - Free UUID v4 Generator & Validator",
  description: "Generate random UUIDs (v4) instantly. Bulk generation up to 100, copy with one click, validate existing UUIDs. Free, secure, runs in your browser.",
  slug: "uuid-generator",
  keywords: [
    "uuid generator",
    "uuid generator online",
    "uuid v4 generator",
    "uuidv4 generator",
    "free uuid generator",
    "random uuid generator",
    "generate uuid v4",
    "generate uuid online",
    "uuid v4 format",
    "uuid v4 vs v7",
    "guid generator",
    "uuid validator",
    "bulk uuid generator",
    "uuid generator javascript",
    "uuid generator python",
  ],
  featureList: [
    "Random UUID v4 generation",
    "Bulk generation up to 100",
    "UUID validator with version detection",
    "One-click copy and copy all",
    "Runs fully in your browser",
  ],
  faqs: [
    {
      question: "Is this UUID generator safe and private?",
      answer: "Yes. UUIDs are generated with your browser's Web Crypto API — cryptographically secure randomness, and nothing is ever sent to a server.",
    },
    {
      question: "Can two UUIDs be the same (collision probability)?",
      answer: "Theoretically possible, practically impossible. A v4 UUID has 122 random bits — you would need to generate about 2.71 quintillion UUIDs to reach a 50% chance of one collision.",
    },
    {
      question: "What is the difference between UUID v4 and v7?",
      answer: "v4 is fully random; v7 embeds a Unix timestamp so UUIDs sort by creation time. Use v4 for general uniqueness, and v7 for database primary keys where ordered inserts improve index performance.",
    },
    {
      question: "UUID vs GUID — what's the difference?",
      answer: "They are the same 128-bit identifier. GUID (Globally Unique Identifier) is simply Microsoft's name for UUID — the formats are interchangeable.",
    },
    {
      question: "What is a UUID used for?",
      answer: "Database primary keys, API request IDs, session tokens, file names, distributed-systems identifiers — anywhere you need an ID that is unique without a central authority coordinating it.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const uuidVersions = [
  { version: "v1", type: "Time + node based", use: "Legacy systems; leaks timestamp and machine hints" },
  { version: "v4", type: "Fully random", use: "The default — general-purpose unique IDs (this tool's main mode)" },
  { version: "v5", type: "Name-based (SHA-1)", use: "Deterministic: same input always produces the same UUID" },
  { version: "v7", type: "Time-ordered random", use: "Modern DB primary keys — sortable by creation time" },
];

const codeSnippets = [
  { lang: "JavaScript", code: "crypto.randomUUID()\n// 'f47ac10b-58cc-4372-a567-0e02b2c3d479'" },
  { lang: "Python", code: "import uuid\nstr(uuid.uuid4())" },
  { lang: "Java", code: "import java.util.UUID;\nUUID.randomUUID().toString();" },
  { lang: "SQL (Postgres)", code: "SELECT gen_random_uuid();" },
];

export default function UuidGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free Developer Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          UUID Generator & Validator (v4 Online)
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Generate random UUID v4 identifiers online — free, instant, and private. Bulk-generate up
          to 100 at once, validate any UUID and detect its version, all with cryptographically
          secure randomness in your browser.
        </p>
      </div>

      <UuidGeneratorTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Generate a UUID in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Pick the version", detail: "v4 random is the default and what 95% of use cases need. Time-based and nil UUIDs are one click away." },
            { step: "Set the count", detail: "Generate 1 for a quick ID or up to 100 for seeding databases and test fixtures." },
            { step: "Copy — single or all", detail: "One-click copy per UUID, or Copy All for the whole batch. Paste anywhere: code, configs, spreadsheets." },
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

      {/* What is a UUID */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">What Is a UUID?</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
          A UUID (Universally Unique Identifier) is a 128-bit ID that is unique across space and
          time without any central registry — two systems on opposite sides of the world can
          generate IDs simultaneously with effectively zero collision risk. The standard format is
          36 characters: 32 hex digits in five dash-separated groups.
        </p>
        <div className="p-5 rounded-2xl border border-border bg-card font-mono text-xs sm:text-sm text-center overflow-x-auto">
          <span className="text-primary font-bold">f47ac10b</span>-<span className="text-muted-foreground">58cc</span>-<span className="text-amber-500 font-bold">4</span><span className="text-muted-foreground">372</span>-<span className="text-emerald-500 font-bold">a</span><span className="text-muted-foreground">567</span>-<span className="text-muted-foreground">0e02b2c3d479</span>
          <p className="mt-3 text-[11px] sm:text-xs text-muted-foreground font-sans">
            The highlighted <span className="text-amber-500 font-semibold">4</span> marks the version; the <span className="text-emerald-500 font-semibold">a</span> position encodes the variant — that is how the validator reads any UUID.
          </p>
        </div>
      </section>

      {/* Versions table */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">UUID v4 vs v7 (and v1, v5): Which to Use?</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
          Versions differ in how the 128 bits are filled — random, time-based, or name-hashed:
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold">Version</th>
                <th className="p-3.5 font-bold">How it works</th>
                <th className="p-3.5 font-bold">When to use it</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {uuidVersions.map((v) => (
                <tr key={v.version} className="border-b border-border last:border-0">
                  <td className="p-3.5 font-semibold text-foreground">{v.version}</td>
                  <td className="p-3.5">{v.type}</td>
                  <td className="p-3.5">{v.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Code snippets */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Generate UUIDs in Code</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Need UUIDs programmatically? Every major language has v4 generation built in — no library required.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {codeSnippets.map((snippet) => (
            <div key={snippet.lang} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/50">
                <h3 className="font-bold text-sm">{snippet.lang}</h3>
              </div>
              <pre className="p-5 text-xs sm:text-sm font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">{snippet.code}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* Best practices */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">3 UUID Mistakes to Avoid</h2>
        <div className="grid gap-4">
          {[
            { mistake: "Using UUIDs as secrets", fix: "UUIDs are identifiers, not passwords — v4 is unguessable in practice, but never rely on an ID for authentication. Use real tokens for auth." },
            { mistake: "v4 primary keys on huge insert-heavy tables", fix: "Random keys fragment database indexes at scale. If insert order matters, v7's time-ordering keeps indexes healthy." },
            { mistake: "Homemade randomness", fix: "Math.random() is not cryptographically secure. Use crypto.randomUUID() or this tool — both use secure system randomness." },
          ].map((m) => (
            <div key={m.mistake} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500 shrink-0" /> {m.mistake}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{m.fix}</p>
            </div>
          ))}
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">More Developer Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/hash-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Hash Generator — SHA-256, MD5 and more</Link></li>
              <li><Link href="/tools/password-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Password Generator — strong random passwords</Link></li>
              <li><Link href="/tools/timestamp-converter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Timestamp Converter — Unix time both ways</Link></li>
              <li><Link href="/tools/json-formatter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JSON Formatter — format and validate JSON</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/best-free-apis-for-developers-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 30 Best Free APIs for Developers</Link></li>
              <li><Link href="/blog/javascript-roadmap-2026-beginner-job-ready" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JavaScript Roadmap: Beginner to Job Ready</Link></li>
              <li><Link href="/blog/how-to-learn-python-2026-beginner-roadmap" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Learn Python: Beginner Roadmap</Link></li>
              <li><Link href="/blog/git-github-beginners-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Git & GitHub for Beginners</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
