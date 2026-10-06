import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonToCsvTool } from "./json-to-csv-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "JSON to CSV Converter",
  title: "Free JSON to CSV Converter - Nested JSON & JSON Lines",
  description:
    "Convert JSON or JSON Lines to CSV in your browser. Flatten nested data, choose columns, preview rows, and export with formula-risk protection.",
  slug: "json-to-csv",
  keywords: [
    "json to csv",
    "json to csv converter",
    "nested json to csv",
    "json lines to csv",
    "jsonl to csv",
    "ndjson to csv",
    "json array to csv",
    "json to csv excel",
    "json to tsv",
    "flatten json to csv",
  ],
  applicationCategory: "DeveloperApplication",
  audience: "Developers and analysts preparing JSON exports for spreadsheets",
  featureList: [
    "Strict JSON and JSON Lines validation with duplicate-key rejection",
    "Explicit JSON Pointer row-source selection",
    "Nested-object flattening or JSON values in cells",
    "One selected array expansion with repeated parent fields",
    "Column selection, renaming, reordering and delimiter controls",
    "Original number tokens preserved in CSV text without numeric arithmetic",
    "Formula-risk protection with transformed-value previews and warnings",
    "Local CSV copy and download without conversion uploads",
  ],
  faqs: [
    {
      question: "Can I convert nested JSON and API responses?",
      answer:
        "Yes. Choose a detected row source such as /data/items, flatten nested fields or retain JSON cells, and optionally expand one array per row. Metadata outside that row source is not exported.",
    },
    {
      question: "Does this support JSON Lines or NDJSON?",
      answer:
        "Yes. Select JSON Lines for one complete JSON value per line. Blank interior lines, a BOM, comments, trailing commas and duplicate keys are rejected; one final newline is allowed.",
    },
    {
      question: "Will Excel keep leading zeros and long numbers?",
      answer:
        "The CSV preserves source number tokens, but Excel can reinterpret them. Import identifiers as Text before loading. Quotes and a UTF-8 BOM do not force text types.",
    },
    {
      question: "What does formula-risk protection change?",
      answer:
        "It prefixes suspected formula-like text cells and exported headers with an apostrophe and reports the count. Actual negative JSON numbers are unchanged. This heuristic is not a universal spreadsheet-safety guarantee.",
    },
    {
      question: "Is the converter free, and does it upload my data?",
      answer:
        "It is free with no account. Conversion uses a local worker, not AI or an upload API; work is not saved automatically. Sitewide analytics and ads operate separately.",
    },
  ],
};

const baseMetadata = generateToolMetadata(toolConfig);
const socialImage = {
  url: `/tools/${toolConfig.slug}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "ByteVerse JSON to CSV Converter: fictional Maya and Leo records with nested city fields converted to matching CSV rows.",
};

export const metadata: Metadata = {
  ...baseMetadata,
  title: { absolute: toolConfig.title },
  openGraph: {
    ...baseMetadata.openGraph,
    title: toolConfig.title,
    images: [socialImage],
  },
  twitter: {
    ...baseMetadata.twitter,
    title: toolConfig.title,
    images: [socialImage],
  },
};

const guideLinkClassName = "font-medium text-[#203e6c] underline decoration-[#3b63c6]/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b63c6] dark:text-blue-200 dark:decoration-blue-300/40";
const headingClassName = "font-semibold tracking-tight text-[#203e6c] dark:text-blue-100";

export default function JsonToCsvPage() {
  return (
    <div className="jcsv-page">
      <ToolJsonLd config={toolConfig} />

      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href="/" className="inline-flex min-h-9 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b63c6]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/tools" className="inline-flex min-h-9 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b63c6]">Tools</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-foreground">JSON to CSV converter</li>
        </ol>
      </nav>

      <header className="grid gap-6 rounded-3xl border border-[#203e6c]/10 bg-[#faf9f6] p-5 shadow-sm dark:border-blue-100/15 dark:bg-[#142238] sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="inline-flex rounded-full bg-[#e9eefb] px-3 py-1.5 text-xs font-medium text-[#203e6c] dark:bg-blue-300/10 dark:text-blue-200">Free · No account · Browser-based</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#203e6c] dark:text-blue-50 sm:text-4xl">JSON to CSV converter</h1>
          <p className="mt-3 text-lg font-medium text-[#203e6c] dark:text-blue-100">Turn nested data into a usable spreadsheet.</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Work with nested objects, API exports and JSON Lines. Choose your rows and columns, then inspect the CSV before you save it.</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="#json-csv-workspace" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#203e6c] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3b63c6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b63c6] dark:bg-blue-200 dark:text-[#142238] dark:hover:bg-blue-100">
              Convert JSON <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#json-csv-method" className={`inline-flex min-h-11 items-center text-sm ${guideLinkClassName}`}>How conversion works</a>
          </div>
        </div>

        <figure className="min-w-0 rounded-2xl border border-[#203e6c]/10 bg-white/90 p-4 dark:border-blue-100/15 dark:bg-[#0e1b2e] sm:p-5">
          <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#203e6c] dark:text-blue-200">JSON → CSV</span>
            <span className="text-muted-foreground">Fictional records</span>
          </figcaption>
          <div className="mt-3 rounded-xl bg-[#f3f5fa] p-3 dark:bg-blue-200/5">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-[#3b63c6] dark:text-blue-300">NESTED JSON</p>
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed wrap-anywhere text-[#203e6c] dark:text-blue-100 sm:text-xs"><code>{'[\n  {"name":"Maya","location":{"city":"Bristol"}},\n  {"name":"Leo","location":{"city":"Oslo"}}\n]'}</code></pre>
          </div>
          <div className="mt-3 border-l-2 border-[#3b63c6] py-1 pl-3">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-[#3b63c6] dark:text-blue-300">CSV · FLATTENED FIELDS</p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed wrap-anywhere text-[#203e6c] dark:text-blue-100"><code>{"name,location.city\nMaya,Bristol\nLeo,Oslo"}</code></pre>
          </div>
        </figure>
      </header>

      <div className="mt-6"><JsonToCsvTool /></div>

      <nav aria-label="JSON to CSV guide" className="mt-6 flex flex-wrap gap-x-6 gap-y-1 border-b border-border pb-3 text-sm">
        <a href="#json-csv-method" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Rows & nested data</a>
        <a href="#json-csv-excel" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>Excel import</a>
        <a href="#json-csv-faq" className={`inline-flex min-h-11 items-center ${guideLinkClassName}`}>FAQs</a>
      </nav>

      <section aria-labelledby="json-csv-steps-heading" className="mt-8">
        <h2 id="json-csv-steps-heading" className={`text-xl ${headingClassName}`}>Convert JSON to CSV in three steps</h2>
        <ol className="mt-5 grid gap-5 border-b border-border pb-7 md:grid-cols-3 md:gap-8">
          {[
            { title: "Add your data", text: "Paste JSON or import a UTF-8 .json, .jsonl, .ndjson or .txt file. Select JSON Lines for one record per line." },
            { title: "Shape the table", text: "Inspect the input, choose a row source and build CSV. Select, rename and reorder columns; enabled headers must remain unique, including after protection." },
            { title: "Review and save", text: "Review exported values and warnings, then copy or download. Input and settings edits invalidate old results: rebuild CSV before exporting again." },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span aria-hidden="true" className="pt-0.5 text-xs font-semibold tabular-nums text-[#3b63c6] dark:text-blue-300">0{index + 1}</span>
              <div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        <section id="json-csv-method" aria-labelledby="json-csv-method-heading" className="min-w-0 scroll-mt-24">
          <h2 id="json-csv-method-heading" className={`text-2xl ${headingClassName}`}>Choose rows, not the wrapper</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>Row source starts at Root; it never guesses. For this fictional response, select <code>/data/items</code>. Only those records become rows; wrapper metadata such as <code>page</code> is not exported.</p>
            <pre className="rounded-xl border border-border bg-muted/40 p-4 whitespace-pre-wrap font-mono text-xs wrap-anywhere text-foreground"><code>{'{"data":{"items":[{"sku":"MAP","qty":2}]},"page":1}'}</code></pre>
            <p>Paths use <a href="https://www.rfc-editor.org/rfc/rfc6901.html" className={guideLinkClassName}>RFC 6901 JSON Pointer</a>: <code>~1</code> represents a slash in a key, and <code>~0</code> a tilde. Array expansion paths are relative to each row. Only detected paths are offered, not wildcards or JavaScript expressions.</p>
          </div>
          <h3 className={`mt-6 text-lg ${headingClassName}`}>Flatten fields or keep JSON cells</h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Flattening produces headers such as <code>location.city</code>. Special keys use escaped brackets to avoid collisions; <code>__proto__</code> remains data. Disable flattening to retain nested objects as JSON cells. Arrays stay JSON by default; joining scalar arrays with the default <code>{" | "}</code> separator is not lossless. Complex arrays stay JSON.</p>
            <p>Expand one selected array, such as <code>/items</code>, to repeat parent fields for each item. There is no Cartesian product across multiple arrays. Empty, missing or null expansion values keep one parent row. Null and missing cells default to blank; separate replacement settings help distinguish them, but CSV does not preserve JSON types.</p>
          </div>
        </section>

        <section aria-labelledby="json-csv-format-heading" className="min-w-0 rounded-2xl border border-[#203e6c]/10 bg-[#f4f6fb] p-5 dark:border-blue-100/15 dark:bg-blue-200/5 sm:p-6">
          <h2 id="json-csv-format-heading" className={`text-xl ${headingClassName}`}>Accepted input & practical limits</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Strict JSON supports objects, scalar roots and heterogeneous arrays. Scalars use a deliberate <code>(value)</code> column; empty objects remain <code>{"{}"}</code> cells. An empty row array cannot convert. Duplicate keys are rejected even when identical. Comments, trailing commas and JSON5 are unsupported.</p>
            <p><a href="https://jsonlines.org/" className={guideLinkClassName}>JSON Lines</a> requires one complete JSON value per line: no blank interior lines or BOM; a final newline is allowed. Ordinary JSON accepts one leading BOM with a warning. Import reads local files, never URLs.</p>
            <p>The table previews actual export-transformed values, initially 25 rows per page. Raw CSV preview stops at 50,000 characters; copy and download use the full result.</p>
          </div>
          <details className="mt-5 border-t border-[#203e6c]/10 pt-4 text-sm dark:border-blue-100/15">
            <summary className="cursor-pointer py-1 font-semibold text-[#203e6c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b63c6] dark:text-blue-100">Limits and large inputs</summary>
            <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
              <p>Input: 2 MiB UTF-8 and 1,000,000 UTF-16 characters; depth 40; 200,000 tokens/nodes. Conversion: 10,000 output rows, 200 columns, 250,000 data cells, 4,000,000 field characters and 8 MiB output. Exceeding a conversion limit rejects the export, not silently truncates it.</p>
              <p>Selectors list up to 60 row sources and 50 array paths per source, with 4,096-character paths and a 65,536-character combined selector-text budget. Headers allow 1,024 characters; null/missing replacements 100 each; join separators 32. Unpaired Unicode surrogates in exported fields are rejected rather than silently replaced. Column discovery can require choosing a smaller row source first. The cancellable worker has a 15-second deadline, not a speed promise.</p>
            </div>
          </details>
        </section>
      </div>

      <div className="mt-10 grid gap-8 border-t border-border pt-8 lg:grid-cols-2 lg:gap-12">
        <section id="json-csv-excel" aria-labelledby="json-csv-excel-heading" className="min-w-0 scroll-mt-24">
          <h2 id="json-csv-excel-heading" className={`text-xl ${headingClassName}`}>Keep identifiers intact in Excel</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>Numbers retain their source spelling, including <code>9123372036854000123</code> and <code>2.370</code>, without numeric arithmetic. Strings retain whitespace and decoded escapes. Excel can still remove leading zeros or retain only 15 significant digits.</p>
            <p>Use Data → From Text/CSV → Transform Data. Set identifier columns to Text, replacing or removing the automatic Changed Type step before Close &amp; Load. Quoting and a BOM do not force Text. See <a href="https://support.microsoft.com/en-us/excel/keeping-leading-zeros-and-large-numbers" className={guideLinkClassName}>Microsoft&apos;s import guidance</a>.</p>
          </div>
          <h3 className={`mt-6 text-lg ${headingClassName}`}>Delimiters, quotes and encoding</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Comma, headers and CRLF are defaults; semicolon, tab (TSV), pipe, LF and quote-all are optional. <a href="https://www.rfc-editor.org/rfc/rfc4180.html" className={guideLinkClassName}>RFC 4180</a> describes quoting fields with delimiters, newlines or quotes, and doubling embedded quotes. The optional UTF-8 BOM defaults on for downloads only; copy omits it.</p>
        </section>

        <section aria-labelledby="json-csv-protection-heading">
          <h2 id="json-csv-protection-heading" className={`text-xl ${headingClassName}`}>Formula-risk protection, not a guarantee</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>Default-on protection checks text and exported headers for <code>=</code>, <code>+</code>, <code>-</code> or <code>@</code>, looking past leading control/whitespace and recognizing full-width equivalents. It prefixes an apostrophe, counts changed fields and leaves actual negative JSON numbers unchanged.</p>
            <p><a href="https://community.owasp.org/attacks/CSV_Injection" className={guideLinkClassName}>OWASP&apos;s CSV injection guidance</a> explains why no sanitization works universally. Importers and save/reopen cycles can defeat protection; review untrusted data before opening it in a spreadsheet.</p>
          </div>
          <h3 className={`mt-6 text-lg ${headingClassName}`}>Local processing, deliberate sharing</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">No AI, conversion API or automatic workspace storage is used. Reload clears in-memory work, not copied text or downloaded files. Sitewide ads and analytics are separate: this is not a network-free-page guarantee. Read the <Link href="/privacy" className={guideLinkClassName}>Privacy Policy</Link>.</p>
        </section>
      </div>

      <aside aria-label="Working with invoice PDFs" className="mt-8 border-l-2 border-[#3b63c6] bg-[#faf9f6] py-4 pr-4 pl-5 text-sm leading-relaxed text-muted-foreground dark:bg-blue-200/5 [&_a]:font-medium [&_a]:text-[#203e6c] [&_a]:underline [&_a]:underline-offset-4 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-[#3b63c6] dark:[&_a]:text-blue-200">
        <p>Starting with invoice PDFs rather than JSON? Use <Link href="/tools/invoice-pdf-to-excel">Invoice PDF to Excel</Link> to review summary fields from selectable-text invoices and export XLSX or CSV locally. Scanned invoices are not supported.</p>
      </aside>

      <section id="json-csv-faq" aria-labelledby="json-csv-faq-heading" className="mt-10 scroll-mt-24 border-t border-border pt-8 pb-6">
        <h2 id="json-csv-faq-heading" className={`text-2xl ${headingClassName}`}>Frequently asked questions</h2>
        <div className="mt-5 divide-y divide-border">
          {toolConfig.faqs.map((faq) => (
            <div key={faq.question} className="py-4 first:pt-0">
              <h3 className="text-sm font-semibold text-foreground">{faq.question}</h3>
              <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
