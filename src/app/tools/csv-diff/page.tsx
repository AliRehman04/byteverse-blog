import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, FileDiff, KeyRound, LockKeyhole, ScanLine, ShieldCheck } from "lucide-react";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { CsvDiffTool } from "@/app/tools/csv-diff/csv-diff-tool";
import styles from "./csv-diff-page.module.css";

const toolConfig = {
  name: "CSV Diff Checker",
  title: "CSV Diff Checker: Compare Two CSV Files by Key",
  description: "Compare two CSV files by ID or composite key. Find added, removed and changed rows, inspect duplicate keys, and export reports locally with no uploads.",
  slug: "csv-diff",
  keywords: ["compare two csv files online", "csv diff", "csv diff checker", "csv comparison tool", "compare csv files by key", "compare csv files ignore row order", "csv differences report"],
  applicationCategory: "DeveloperApplication",
  audience: "Developers, analysts and store operators comparing CSV exports",
  featureList: [
    "Explicit single or composite key matching independent of row order",
    "Added, removed, changed and unchanged records with before/after values",
    "Duplicate and blank key detection without guessing matches",
    "Per-file delimiter and encoding selection with strict CSV validation",
    "Exact identifier strings, selected-column comparison and optional value normalization",
    "Local CSV and JSON reports, bounded worker processing and cancellation",
  ],
};

const faqs = [
  { question: "How do I compare two CSV files with different row order?", answer: "Add the original and updated exports, inspect them, and select a shared unique key such as ID or SKU. Rows match by that exact key, not their position. Reordered columns also work when their header names match exactly." },
  { question: "Can I match rows using more than one column?", answer: "Yes. Choose up to five shared key columns, such as SKU and warehouse. The combined values must be unique and nonblank in each file. Duplicate or blank keys stop the comparison and show record numbers instead of silently selecting a match." },
  { question: "Will leading zeros, long IDs and date-like values change?", answer: "No automatic number or date conversion is used. Values remain strings, so 00123 differs from 123 and long IDs retain their digits. CSV downloads can still be reinterpreted by spreadsheet apps; the JSON report preserves exact strings." },
  { question: "Which files and sizes are supported?", answer: "CSV, TSV and delimited text with a header row are supported, not XLSX or PDF. Files can be up to 5 MiB. Both files and pasted text are limited to 2,000,000 UTF-16 character units, 20,000 data records, 100 columns and 500,000 data cells. Use UTF-8, UTF-16 LE/BE or Windows-1252 and choose comma, semicolon, tab or pipe. Reports are limited to 16 MiB." },
  { question: "Is it free, and are my CSV files uploaded?", answer: "The tool is free without an account. Files are read and compared in a browser worker; there is no upload API, AI call or automatic data storage. This tool page excludes site ads, analytics, translation and chat. Downloads and clipboard copies remain on your device until you remove them." },
];

const baseMetadata = generateToolMetadata(toolConfig);
const socialImage = { url: "/tools/csv-diff/opengraph-image", width: 1200, height: 630, alt: "ByteVerse CSV Diff Checker with an illustrative inventory comparison: added, removed, changed and unchanged records." };
export const dynamic = "force-static";
export const metadata: Metadata = {
  ...baseMetadata,
  title: { absolute: toolConfig.title },
  openGraph: { ...baseMetadata.openGraph, title: toolConfig.title, images: [socialImage] },
  twitter: { ...baseMetadata.twitter, title: toolConfig.title, images: [socialImage] },
};

export default function CsvDiffPage() {
  return (
    <div className={styles.page} data-csv-diff-page>
      <ToolJsonLd config={toolConfig} />
      <div className={styles.container}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/" prefetch={false}>Home</Link><span aria-hidden="true">/</span>
          <Link href="/tools" prefetch={false}>Tools</Link><span aria-hidden="true">/</span>
          <span aria-current="page">CSV diff checker</span>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><FileDiff size={15} aria-hidden="true" /> THE EXPORT REVIEW TOOL</p>
            <h1>CSV diff checker<span>Less noise.<br />Clearer changes.</span></h1>
            <p className={styles.intro}>Compare two CSV files online by ID or composite key. Find the records that were added, removed or changed—even when the rows move.</p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#csv-diff-workspace">Compare my CSVs <ArrowDown size={16} aria-hidden="true" /></a>
              <a className={styles.textLink} href="#csv-diff-how">See how it works <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
            <ul className={styles.trust} aria-label="Tool features"><li><LockKeyhole size={14} aria-hidden="true" /> No uploads</li><li>No sign-up</li><li>Free CSV + JSON reports</li></ul>
          </div>
          <figure className={styles.demo}>
            <figcaption><span><span className={styles.dot} /> Inventory review</span><span>Illustrative example</span></figcaption>
            <div className={styles.demoTitle}><strong>Same records. New order.</strong><span>Matched by <code>sku</code></span></div>
            <table>
              <caption className={styles.srOnly}>Fictional inventory changes using the built-in inventory example</caption>
              <thead><tr><th scope="col">SKU</th><th scope="col">Stock</th><th scope="col">Result</th></tr></thead>
              <tbody>
                <tr><td>001</td><td>12 → 12</td><td><span className={styles.neutral}>Unchanged</span></td></tr>
                <tr><td>002</td><td>30 → —</td><td><span className={styles.removed}>Removed</span></td></tr>
                <tr><td>003</td><td>8 → 7</td><td><span className={styles.changed}>Changed</span></td></tr>
                <tr><td>004</td><td>— → 4</td><td><span className={styles.added}>Added</span></td></tr>
              </tbody>
            </table>
            <p><ShieldCheck size={15} aria-hidden="true" /> Actual values, not a line-by-line guess.</p>
          </figure>
        </header>

        <CsvDiffTool />

        <section id="csv-diff-how" aria-labelledby="csv-diff-how-title" className={styles.section}>
          <p className={styles.eyebrow}>A SMALLER PATH FROM EXPORT TO ANSWER</p>
          <h2 id="csv-diff-how-title">Compare CSV files in three deliberate steps.</h2>
          <ol className={styles.steps}>
            <li><span>01</span><h3>Inspect both exports</h3><p>Choose files or paste CSV. Set the delimiter for each side and confirm its preview. Malformed quotes, duplicate headers and uneven rows are reported—not hidden.</p></li>
            <li><span>02</span><h3>Choose what identifies a row</h3><p>Select a unique key and the columns worth comparing. For stock by location, use SKU + warehouse. The tool never silently chooses price or another convenient field.</p></li>
            <li><span>03</span><h3>Review, then take the report</h3><p>Filter the changes, open a record for before/after values, and export a complete report. Results are invalidated when you edit the inputs or comparison settings.</p></li>
          </ol>
        </section>

        <div className={styles.guideGrid}>
          <section aria-labelledby="csv-diff-key-title" className={styles.guide}>
            <KeyRound size={23} aria-hidden="true" />
            <h2 id="csv-diff-key-title">Match identities, not line numbers.</h2>
            <p>A product export can be sorted differently every day. A text diff may show moved lines as deletions and additions. A key-based CSV comparison finds the same SKU wherever it appears, then compares the selected fields.</p>
            <p>The built-in inventory example has three records in each file: SKU 001 is unchanged, 002 is removed, 003 changes stock from 8 to 7, and 004 is added. Four result rows account for both exports.</p>
            <p>If a key appears twice, there is no honest one-to-one match without more information. Add another key column or correct the source data. Key values always match exactly; value trim/case options do not change identity.</p>
          </section>
          <section aria-labelledby="csv-diff-scope-title" className={styles.guide}>
            <ScanLine size={23} aria-hidden="true" />
            <h2 id="csv-diff-scope-title">A precise scope beats a vague “identical.”</h2>
            <p>Headers match by exact name, including case and whitespace. Only selected shared columns affect changed/unchanged status; unshared and deselected columns are listed explicitly. There is no automatic header remapping.</p>
            <p>Spaces, letter case and numeric spelling matter by default. You can ignore outer whitespace or letter case in compared values, but <code>10</code> and <code>10.00</code> still differ. The original cell text stays available in the review.</p>
            <p>This is an export comparison, not a byte-for-byte file test, formula evaluator, automatic merger or proof that a data migration is complete. For code or prose, use the <Link href="/tools/diff-checker" prefetch={false}>text diff checker</Link>.</p>
          </section>
        </div>

        <section className={styles.safety} aria-labelledby="csv-diff-formats-title">
          <div><p className={styles.eyebrow}>BUILT FOR REAL EXPORTS</p><h2 id="csv-diff-formats-title">Keep the details that are easy to lose.</h2></div>
          <div className={styles.safetyGrid}>
            <div><h3>Quoted text stays together</h3><p>Quoted commas, doubled quotes and embedded line breaks follow the CSV conventions described in <a href="https://www.rfc-editor.org/rfc/rfc4180" target="_blank" rel="noopener noreferrer">RFC 4180</a>. Empty physical records are skipped; quoted empty cells are not. Record numbers count logical records, not physical lines inside a quoted cell.</p></div>
            <div><h3>Identifiers stay text</h3><p><code>00123</code> and long identifiers retain their characters. The tool cannot recover digits Excel already removed. Read the guide to <Link href="/blog/excel-csv-leading-zeros-2026" prefetch={false}>keeping leading zeros in CSV exports</Link>, or check <Link href="/blog/excel-csv-special-characters-utf8" prefetch={false}>CSV encoding in Excel</Link> if names look garbled.</p></div>
            <div><h3>Know your report format</h3><p>CSV exports prefix suspected formula-like values with a tab for spreadsheet viewing. This changes those exported cells and is not a universal safety guarantee; see <a href="https://community.owasp.org/attacks/CSV_Injection" target="_blank" rel="noopener noreferrer">OWASP&apos;s guidance</a>. JSON preserves exact strings and includes all source columns for exported records, including ignored ones.</p></div>
            <div><h3>Bounded, cancellable work</h3><p>Files allow 5 MiB. Both files and pasted text allow 2 million UTF-16 character units, 20,000 records, 100 columns and 500,000 cells. Headers allow 256 characters; cells allow 100,000. Reports stop at 16 MiB. Operations have a 15-second deadline and a cancel control; limits reject rather than quietly truncate data.</p></div>
          </div>
        </section>

        <aside className={styles.callout} aria-label="Related data workflow"><FileDiff size={22} aria-hidden="true" /><p>Starting with API exports? Shape each snapshot with <Link href="/tools/json-to-csv" prefetch={false}>JSON to CSV</Link>, then compare the resulting tables here. Working from invoices? <Link href="/tools/invoice-pdf-to-excel" prefetch={false}>Invoice PDF to Excel</Link> extracts reviewable fields from selectable-text PDFs.</p></aside>

        <section className={styles.section} aria-labelledby="csv-diff-faq-title">
          <p className={styles.eyebrow}>BEFORE YOU COMPARE</p><h2 id="csv-diff-faq-title">A few useful answers.</h2>
          <div className={styles.faqs}>{faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
        </section>
        <p className={styles.endnote}>Built by ByteVerse for practical export review. Parsing uses <a href="https://www.papaparse.com/docs" target="_blank" rel="noopener noreferrer">Papa Parse</a> with explicit validation. No claim of recovering lost data or certifying spreadsheet safety. <Link href="/privacy" prefetch={false}>Privacy details</Link>.</p>
      </div>
    </div>
  );
}