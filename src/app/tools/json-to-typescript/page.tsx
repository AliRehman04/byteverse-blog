import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Braces, Check, FileCode2, Layers, ListChecks, Monitor } from "lucide-react";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { JsonToTypeScriptTool } from "./json-to-typescript-tool";

const toolConfig = {
  name: "JSON to TypeScript Converter",
  title: "Free JSON to TypeScript Converter - Interfaces & Types",
  description: "Generate TypeScript interfaces or types from JSON and JSON Lines. Infer optional fields, review mixed arrays, select nested data, and download your types locally.",
  slug: "json-to-typescript",
  keywords: [
    "json to typescript", "json to typescript interface", "json to typescript type",
    "json to typescript converter", "typescript interface generator", "json to ts",
    "nested json to typescript", "json array to typescript interface",
    "json to typescript optional properties", "json lines to typescript",
  ],
  applicationCategory: "DeveloperApplication",
  audience: "Developers drafting TypeScript types from JSON API examples",
  featureList: [
    "Strict JSON and JSON Lines with duplicate-key rejection",
    "Missing-field optionality and null unions from all selected samples",
    "Nested object declarations and mixed-array union types",
    "Explicit JSON Pointer selection and array-item inference",
    "Interface or type output, readonly, optional string literals and naming controls",
    "Field-presence review and complete .ts or .d.ts downloads",
    "Local worker generation with no conversion API or automatic data saving",
  ],
  faqs: [
    {
      question: "How do I convert JSON to a TypeScript interface?",
      answer: "Paste JSON or import a UTF-8 file, choose a root name and interface style, then select Generate types. Nested objects get named declarations. Array, scalar and union roots use a type alias when needed. Review the result before using it.",
    },
    {
      question: "How are missing fields, null and mixed arrays handled?",
      answer: "All selected samples are considered. A property missing from some objects at the same location becomes optional; an observed null adds a null branch. Mixed values form unions. Empty-only arrays use unknown[] because their element type is not known.",
    },
    {
      question: "Can I use JSON Lines or a nested API response?",
      answer: "Yes. JSON Lines treats each line as another example of the same root, not an extra array. A JSON Pointer such as /data/items selects a nested value in every sample. Infer array item combines the selected arrays' direct items; a blank pointer preserves the whole value.",
    },
    {
      question: "Should I choose interface or type, and does the result validate data?",
      answer: "Interfaces work for object shapes and support declaration merging. Type aliases also describe unions, arrays and scalars. Neither validates runtime JSON. This converter does not run a TypeScript compiler in your browser or generate runtime validators, classes or JSON Schema.",
    },
    {
      question: "Is it free, and where is my JSON processed?",
      answer: "The converter is free with no account. Parsing and generation use a local browser worker, not an AI or upload API, and work is not saved automatically. Sitewide ads and analytics operate separately. String literal mode includes source string values in copied and downloaded code.",
    },
  ],
};

const baseMetadata = generateToolMetadata(toolConfig);
const socialImage = {
  url: "/tools/json-to-typescript/opengraph-image", width: 1200, height: 630,
  alt: "ByteVerse JSON to TypeScript: fictional account samples produce a mixed ID type and an optional nullable email field.",
};

export const metadata: Metadata = {
  ...baseMetadata,
  title: { absolute: toolConfig.title },
  openGraph: { ...baseMetadata.openGraph, title: toolConfig.title, images: [socialImage] },
  twitter: { ...baseMetadata.twitter, title: toolConfig.title, images: [socialImage] },
};

const exampleInput = `[
  {"id":101,"name":"Demo Finch","email":"finch@example.invalid"},
  {"id":"demo-102","name":"Demo Wren"},
  {"id":103,"name":"Demo Lark","email":null}
]`;
const exampleOutput = `export interface Account {
  id: number | string;
  name: string;
  email?: string | null;
}
`;

const capabilities = [
  { icon: Layers, title: "Look beyond the first record", text: "Merge object observations at each structural location. Missing properties stay visible instead of becoming silently required." },
  { icon: Braces, title: "Keep the shape you selected", text: "Preserve a response wrapper or array, or explicitly infer its items. No guessed API path and no dropped mixed-value branches." },
  { icon: ListChecks, title: "Review the evidence", text: "See each property's type, optionality and presence count. Inspect individual declarations without accidentally exporting only a preview." },
  { icon: FileCode2, title: "Fit your codebase", text: "Choose interface or type, recursive readonly, indentation and property order. Copy full code or download a type-only .ts or .d.ts file." },
];

export default function JsonToTypeScriptPage() {
  return (
    <div className="jts-page">
      <ToolJsonLd config={toolConfig} />
      <header className="jts-hero">
        <div className="jts-hero-copy">
          <p className="jts-kicker"><span aria-hidden="true" />FREE DEVELOPER WORKSPACE</p>
          <h1>JSON to TypeScript.<br /><span>Types you can inspect.</span></h1>
          <p className="jts-hero-description">Turn JSON samples into readable interfaces and types. Understand missing fields, keep mixed values, and review the shape before it enters your codebase.</p>
          <div className="jts-hero-actions">
            <a href="#json-ts-workspace" className="jts-hero-button">Generate your types <ArrowRight size={18} aria-hidden="true" /></a>
            <a href="#jts-example-section" className="jts-hero-link">See a worked example <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
          <ul className="jts-hero-benefits">
            <li><Check size={15} aria-hidden="true" />No account</li>
            <li><Monitor size={15} aria-hidden="true" />Local generation</li>
            <li><FileCode2 size={15} aria-hidden="true" />JSON + JSON Lines</li>
          </ul>
        </div>
        <div className="jts-hero-card notranslate" translate="no" dir="ltr">
          <div className="jts-hero-card-bar"><span className="jts-hero-ts">TS</span><span>Account · interface</span><span className="jts-hero-demo">EXAMPLE</span></div>
          <pre aria-label="Illustrative Account interface"><code>{exampleOutput}</code></pre>
          <div className="jts-hero-evidence"><ListChecks size={19} aria-hidden="true" /><p><strong>email appears in 2 of 3 objects.</strong><br />Optional and nullable are different evidence.</p></div>
          <p className="jts-hero-disclaimer">Fictional samples below. Inferred types, not runtime validation.</p>
        </div>
      </header>

      <JsonToTypeScriptTool />

      <section className="jts-content-section" aria-labelledby="jts-how-heading">
        <div className="jts-content-heading"><p className="jts-kicker">FROM RESPONSE TO REVIEW</p><h2 id="jts-how-heading">Generate types in three deliberate steps.</h2></div>
        <ol className="jts-step-grid">
          {[
            { title: "Bring representative JSON", text: "Paste a complete value or import UTF-8 JSON, JSONL, NDJSON or TXT. Include more than one example when fields or types vary. Generation starts only when you ask." },
            { title: "Choose the boundary", text: "Set a root name and style. Keep the selected value or infer array items. For a wrapped response, use an explicit JSON Pointer such as /data/items." },
            { title: "Check before you copy", text: "Review field presence and inference notes. Copy or download all declarations, then type-check them in your project. Changing input or settings invalidates the old result." },
          ].map((step, index) => <li key={step.title}><span className="jts-step-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}
        </ol>
      </section>

      <section className="jts-content-section" id="jts-example-section" aria-labelledby="jts-example-heading">
        <div className="jts-content-heading"><p className="jts-kicker">WHY EVERY SAMPLE MATTERS</p><h2 id="jts-example-heading">A mixed ID. A missing email. Nothing hidden.</h2><p>These three fictional records use root name <code>Account</code>, interface style and <strong>Infer array item</strong>. Other settings remain at their defaults.</p></div>
        <div className="jts-example-grid notranslate" translate="no" dir="ltr">
          <div className="jts-example-card"><h3>JSON · three account samples</h3><pre id="jts-example-json" tabIndex={0} aria-label="Worked JSON example"><code>{exampleInput}</code></pre></div>
          <div className="jts-example-card jts-example-output"><h3>TypeScript · one item shape</h3><pre id="jts-example-types" tabIndex={0} aria-label="Worked TypeScript output"><code>{exampleOutput}</code></pre></div>
        </div>
        <div className="jts-example-explanation">
          <p><code>id: number | string</code> retains both observed types, not just the first value.</p>
          <p><code>email?</code> records its absence in one object; <code>| null</code> records an explicit null in another.</p>
          <p>Keep selected value would instead preserve the root array with an item declaration. One sample cannot prove a field will always exist.</p>
        </div>
      </section>

      <section className="jts-content-section" aria-labelledby="jts-capabilities-heading">
        <div className="jts-content-heading"><p className="jts-kicker">LESS GUESSWORK, BETTER STARTING TYPES</p><h2 id="jts-capabilities-heading">Built for real API-shape questions.</h2></div>
        <div className="jts-capability-grid">{capabilities.map(({ icon: Icon, title, text }) => <div key={title} className="jts-content-card"><Icon size={23} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></div>)}</div>
      </section>

      <section className="jts-content-section jts-guide-grid" aria-label="Type inference guidance">
        <div className="jts-guide-card">
          <p className="jts-kicker">NESTED JSON & MULTIPLE EXAMPLES</p><h2>Select the data you actually need.</h2>
          <p>For <code>{'{"data":{"items":[...]},"cursor":"..."}'}</code>, the pointer <code>/data/items</code> selects the array. Then choose <strong>Infer array item</strong> for an item type. Wrapper metadata is deliberately outside that selection.</p>
          <p>JSON Pointer uses <code>~1</code> for a slash in a key and <code>~0</code> for a tilde. Blank selects the whole value; <code>/</code> selects an empty key. Array indices must be canonical, such as <code>/0</code>, not <code>/01</code>.</p>
          <p>In JSON Lines, each line is an example of the same root. The path must resolve in every sample; a missing later path fails rather than silently omitting data. Interior blank lines, comments, trailing commas, duplicate decoded keys and a JSONL BOM are rejected. One final newline is allowed.</p>
          <p>New to response shapes? Start with the <Link href="/blog/typescript-for-beginners-2026-complete-guide">TypeScript beginner guide</Link> or practice with <Link href="/blog/best-free-apis-for-developers-2026">public developer APIs</Link>. Do not include credentials in your examples.</p>
        </div>
        <div className="jts-guide-card">
          <p className="jts-kicker">INTERFACE VS TYPE</p><h2>Choose the style, preserve the shape.</h2>
          <p>An <code>interface</code> is a good fit for named object shapes and supports declaration merging. A <code>type</code> alias can also name scalar, array and union types. Neither choice makes the result a validated API contract.</p>
          <p>Interface mode still uses a root type alias where necessary: for example <code>type Root = number[];</code>. Nested objects keep your chosen style. Different structural locations receive separate, collision-safe declaration names.</p>
          <p><strong>Readonly</strong> marks properties and arrays recursively at compile time; it does not freeze data. <strong>All properties optional</strong> is a deliberate override, not proof of missing data. Presence counts still show the actual observations.</p>
          <p>With exports off, full output retains <code>export {"{}"};</code> to stay module-scoped. A declaration-only download describes types; it does not create JavaScript values. Use the code in your project and review it with your compiler and tests.</p>
        </div>
      </section>

      <section className="jts-content-section jts-boundaries" aria-labelledby="jts-boundaries-heading">
        <div className="jts-content-heading"><p className="jts-kicker">CLEAR LIMITS, NO FALSE CERTAINTY</p><h2 id="jts-boundaries-heading">What the samples cannot tell you.</h2></div>
        <div className="jts-boundary-grid">
          <div><h3>Inference is not validation</h3><p>Objects at one structural location are merged; relationships between discriminator and payload fields are not preserved. There is no tagged-union, tuple, class, Date, bigint, JSON Schema or runtime-validator generation. Date-like strings remain strings, numeric JSON tokens become <code>number</code>, and there is no arbitrary URL import.</p><p>Only empty arrays produce <code>unknown[]</code>; null-only observations remain <code>null</code>. Only empty objects use <code>{'{ [key: string]: unknown }'}</code> rather than the misleading broad <code>{"{}"}</code> type. Supply representative examples and review against the real API contract.</p></div>
          <div><h3>Privacy and literal values</h3><p>Conversion runs in a local worker with no conversion uploads, AI calls or automatic workspace saving. Reloading clears the work; clipboard contents and downloads persist outside the workspace. Sitewide analytics and ads are separate, so this is not a claim that the entire page is isolated from third-party scripts.</p><p>String literal mode embeds source string values in exported code. It widens to <code>string</code> beyond 20 distinct values or 120 characters per value at a location. Observed literals are not a complete enum. Keys appear in output in every mode; use sanitized samples when the source is sensitive.</p></div>
          <div><h3>Bounded, not truncated</h3><p>Input is limited to 1,000,000 UTF-16 characters and 2 MiB of UTF-8, with depth 40, 200,000 tokens/nodes and 10,000 JSONL samples or selected values. Inference supports up to 200 declarations and 2,000 generated properties, with 1,024-character keys and a 4,096-character pointer.</p><p>Full output is capped at 400,000 characters. The worker has a cancellable 15-second deadline. Limits reject an operation; they never offer a silently shortened file. The browser generates declarations but does not run a TypeScript compiler on your output.</p></div>
        </div>
      </section>

      <section className="jts-content-section jts-faq-section" id="jts-faq" aria-labelledby="jts-faq-heading">
        <div className="jts-content-heading"><p className="jts-kicker">A FEW USEFUL ANSWERS</p><h2 id="jts-faq-heading">JSON to TypeScript, explained.</h2></div>
        <div className="jts-faq-list">{toolConfig.faqs.map((faq) => <details key={faq.question} className="jts-faq"><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
      </section>

      <section className="jts-content-section jts-next-section" aria-labelledby="jts-next-heading">
        <div><p className="jts-kicker">KEEP YOUR WORKFLOW MOVING</p><h2 id="jts-next-heading">Inspect, type, then compare.</h2><p>Use the <Link href="/tools/json-formatter">JSON Formatter</Link> to inspect a response, <Link href="/tools/json-to-csv">JSON to CSV</Link> for a table export, or <Link href="/tools/diff-checker">Diff Checker</Link> to review changed declarations.</p></div>
        <div className="jts-source-links"><h3>Method references</h3><a href="https://www.typescriptlang.org/docs/handbook/2/everyday-types.html" target="_blank" rel="noopener noreferrer">TypeScript: everyday types <ArrowRight size={14} aria-hidden="true" /></a><a href="https://www.typescriptlang.org/docs/handbook/2/objects.html" target="_blank" rel="noopener noreferrer">TypeScript: objects and readonly <ArrowRight size={14} aria-hidden="true" /></a><a href="https://jsonlines.org/" target="_blank" rel="noopener noreferrer">JSON Lines format <ArrowRight size={14} aria-hidden="true" /></a><a href="https://www.rfc-editor.org/rfc/rfc6901" target="_blank" rel="noopener noreferrer">RFC 6901: JSON Pointer <ArrowRight size={14} aria-hidden="true" /></a></div>
      </section>
    </div>
  );
}