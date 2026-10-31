import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Binary, Columns3, FileSpreadsheet, Hash, LockKeyhole, ScanSearch, ShieldAlert, Wrench } from "lucide-react";
import CsvStudio from "@/components/csv-studio/csv-studio";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import styles from "./csv-repair-page.module.css";

const toolConfig = {
  name: "CSV Repair Tool",
  title: "CSV Repair Tool — Preserve IDs & Export Excel | ByteVerse",
  description: "Fix broken CSV files free: detect delimiters and encodings, keep leading zeros and long IDs, preview every repair and export Excel-ready XLSX. No uploads.",
  slug: "csv-repair",
  keywords: ["csv repair tool", "fix csv file online", "keep leading zeros in csv", "csv to xlsx", "csv opens in one column", "csv scientific notation", "csv encoding fix", "csv formula injection"],
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser",
  audience: "Analysts, store operators and anyone moving CSV exports into Excel",
  featureList: [
    "Encoding detection for UTF-8, UTF-16, Windows-1252 and ISO-8859-1 with a side-by-side Encoding Lab",
    "Delimiter, quote, header and line-ending detection with plain-language reasons",
    "Validation for broken quotes, ragged rows, duplicates, blank headers, hidden characters and formula-like cells",
    "Identifier protection for ZIP codes, phone numbers, SKUs and long account IDs",
    "Previewed, undoable repairs with a change log and reusable local recipes",
    "Excel XLSX export with text cells, frozen header, filters and a validation summary; CSV, TSV and JSON export",
  ],
};

const faqs = [
  { question: "Why did Excel remove the zeros from my ZIP codes?", answer: "A CSV file is plain text with no column types, so Excel guesses. A value like 02115 looks like a number, so Excel stores 2115. CSV Studio flags columns with leading zeros, lets you keep them as text, and writes them as text cells in the XLSX export so they open as 02115." },
  { question: "Why does my CSV open in one column?", answer: "Excel splits a CSV using your system’s list separator. A semicolon file opened on a comma system, or the reverse, lands in a single column. CSV Studio detects the delimiter by checking which character splits the rows consistently and explains its choice. Exporting XLSX avoids the separator problem entirely." },
  { question: "Can this tool recover zeros that are already gone?", answer: "No. If leading zeros are already missing from the file you uploaded, this tool cannot invent them. When you know the correct fixed length, such as five-digit ZIP codes, you can pad digit-only values to that length yourself and review every change before applying it." },
  { question: "Are my files uploaded to ByteVerse?", answer: "No. Files are processed in your browser. ByteVerse does not receive your spreadsheet contents in this tool’s normal workflow. The page loads like any website, but this tool page does not load ads, analytics or the site chat, and saved recipes keep column rules only, never cell values." },
  { question: "What is the largest file I can use?", answer: "Up to 25 MB of text (after unpacking a .gz or .zip), 100,000 data rows, 500 columns and 5 million cells. A single field can hold up to 1 million characters, but an Excel cell holds at most 32,767, so longer values must be shortened before an XLSX export. Files over 5 MB can feel slow on phones." },
  { question: "Why should I export XLSX instead of CSV?", answer: "An XLSX file stores each cell’s type. Text columns stay text, so leading zeros, long IDs and date-like codes open exactly as shown. A CSV has no types, so Excel guesses again every time it opens the file. The XLSX export also adds a frozen header, filters, and optional sheets for the validation summary and applied changes." },
  { question: "What is formula injection in a spreadsheet?", answer: "Cells that begin with =, +, - or @ can be run as formulas when a CSV is opened in a spreadsheet, and a crafted formula can leak data or trigger warnings users click through. CSV Studio flags formula-like cells. The XLSX export writes every cell as a value, never a formula. The spreadsheet-safe CSV option adds an apostrophe, which helps but is not a universal guarantee." },
  { question: "Why is a 16-digit ID showing up as 5.43E+15?", answer: "Excel keeps numbers to 15 significant digits and shows large ones in scientific notation, so digits after the 15th become zeros. If your file already contains 5.43E+15, the original digits are gone and only the source system can supply them. For intact IDs, keep the column as text and export XLSX." },
];

const guides = [
  { href: "/blog/excel-csv-leading-zeros-2026", title: "Keep leading zeros in Excel CSV files", text: "Why Excel strips zeros from IDs and ZIP codes, and four ways to stop it." },
  { href: "/blog/csv-opens-in-one-column-excel", title: "CSV opens in one column in Excel", text: "List separators, regional settings and the fastest reliable fixes." },
  { href: "/blog/excel-csv-special-characters-utf8", title: "Fix special characters in Excel CSV", text: "UTF-8, BOMs and what to do when café turns into cafÃ©." },
];

const baseMetadata = generateToolMetadata(toolConfig);
const socialImage = { url: "/tools/csv-repair/opengraph-image", width: 1200, height: 630, alt: "ByteVerse CSV Studio: fix your CSV and keep your data intact. A ZIP code column kept as text in an Excel export." };
export const dynamic = "force-static";
export const metadata: Metadata = {
  ...baseMetadata,
  title: { absolute: toolConfig.title },
  openGraph: { ...baseMetadata.openGraph, title: toolConfig.title, images: [socialImage] },
  twitter: { ...baseMetadata.twitter, title: toolConfig.title, images: [socialImage] },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
};

export default function CsvRepairPage() {
  return (
    <div className={styles.page} data-csv-repair-page>
      <ToolJsonLd config={toolConfig} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <div className={styles.container}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/" prefetch={false}>Home</Link><span aria-hidden="true">/</span>
          <Link href="/tools" prefetch={false}>Tools</Link><span aria-hidden="true">/</span>
          <span aria-current="page">CSV Repair Tool</span>
        </nav>

        <header className={styles.identity}>
          <div className={styles.identityCopy}>
            <h1>Free CSV Repair Tool &amp; Excel Export</h1>
            <p>Fix CSV formatting issues, preserve leading zeros and IDs, preview repairs, and export Excel-ready XLSX files.</p>
          </div>
          <div className={styles.identityMeta}>
            <a className={styles.privacyChip} href="#csv-studio-privacy"><LockKeyhole size={14} aria-hidden="true" /> Processed in your browser</a>
            <p className={styles.commandHint}>Press <kbd>Ctrl</kbd> <kbd>K</kbd> (<kbd>⌘</kbd> <kbd>K</kbd> on Mac) for commands</p>
          </div>
        </header>

        <section id="csv-repair-workspace" aria-label="CSV Studio workspace" className={styles.workspace}>
          <CsvStudio />
        </section>

        <section className={styles.section} aria-labelledby="csv-repair-how-title">
          <p className={styles.eyebrow}>HOW CSV STUDIO WORKS</p>
          <h2 id="csv-repair-how-title">Fix your CSV. Keep your data intact.</h2>
          <ol className={styles.steps}>
            <li><span>01</span><h3>Inspect</h3><p>Drop a file and CSV Studio reads its encoding, delimiter, quotes and line endings, then checks every column. Each finding says what is wrong, where it is, and what fixing it would change.</p></li>
            <li><span>02</span><h3>Repair with a preview</h3><p>Trim spaces, rebuild header names, remove blank or duplicate rows, split and merge columns, or find and replace. Every repair shows before and after values first, and every step can be undone.</p></li>
            <li><span>03</span><h3>Export what Excel expects</h3><p>The XLSX export writes text and ID columns as text cells, and numbers or dates as typed cells only in columns you set to those types. It then reads the workbook back to verify it before the download starts.</p></li>
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="csv-repair-excel-title">
          <p className={styles.eyebrow}>WHERE CSV DATA GETS DAMAGED</p>
          <h2 id="csv-repair-excel-title">Why Excel changes CSV values.</h2>
          <p className={styles.lead}>A CSV file stores text and nothing else. When Excel opens one directly, it guesses a type for every value. Most guesses are right; the wrong ones quietly change identifiers. Microsoft documents this behavior in its guide to <a href="https://learn.microsoft.com/en-us/office/troubleshoot/excel/long-numbers-incorrectly-in-excel" target="_blank" rel="noopener noreferrer">keeping leading zeros and large numbers</a>.</p>
          <div className={styles.cards}>
            <article className={styles.card}>
              <Hash size={20} aria-hidden="true" />
              <h3>Leading zeros disappear</h3>
              <p>ZIP codes, employee numbers and SKUs such as <code>02115</code> or <code>000123</code> become <code>2115</code> and <code>123</code>. CSV Studio flags these columns and protects them as text.</p>
            </article>
            <article className={styles.card}>
              <Binary size={20} aria-hidden="true" />
              <h3>Long IDs lose digits</h3>
              <p>Excel keeps 15 significant digits. A 20-digit account number turns into <code>4.00012E+19</code>, and the digits after the 15th become zeros. Text cells keep every digit.</p>
            </article>
            <article className={styles.card}>
              <Columns3 size={20} aria-hidden="true" />
              <h3>Codes turn into dates</h3>
              <p>Values like <code>1/2</code>, <code>Mar-26</code> or <code>3-4</code> can become dates. CSV Studio marks date-like text and only writes real dates when you choose a date type and format.</p>
            </article>
            <article className={styles.card}>
              <ScanSearch size={20} aria-hidden="true" />
              <h3>Everything lands in one column</h3>
              <p>A semicolon file on a comma system, or a tab file named .csv, opens as one long column. The detector checks which delimiter splits rows consistently and tells you why.</p>
            </article>
          </div>
        </section>

        <div className={styles.split}>
          <section className={styles.guide} aria-labelledby="csv-repair-formula-title">
            <ShieldAlert size={22} aria-hidden="true" />
            <h2 id="csv-repair-formula-title">Formula-like cells are flagged, never run.</h2>
            <p>Spreadsheet apps can treat a cell that begins with <code>=</code>, <code>+</code>, <code>-</code> or <code>@</code> as a formula. A crafted value can pull data from other cells or prompt a warning that people click through. <a href="https://community.owasp.org/attacks/CSV_Injection" target="_blank" rel="noopener noreferrer">OWASP describes this as CSV injection</a>.</p>
            <p>CSV Studio lists every formula-like cell. The XLSX export stores all cells as values, so nothing is written as a formula. The spreadsheet-safe CSV option prefixes those cells with an apostrophe while leaving signed numbers like <code>-12.50</code> alone. That reduces risk, but no CSV setting is safe in every spreadsheet app.</p>
          </section>
          <section className={styles.guide} aria-labelledby="csv-repair-encoding-title">
            <Wrench size={22} aria-hidden="true" />
            <h2 id="csv-repair-encoding-title">When “café” turns into “cafÃ©”.</h2>
            <p>CSV files don’t record their encoding. A UTF-8 file read as Windows-1252 shows <code>Ã©</code> instead of <code>é</code>; the reverse shows <code>�</code>. CSV Studio checks the byte-order mark and whether the bytes are valid UTF-8, then explains what it found.</p>
            <p>When it can’t be sure, the Encoding Lab decodes the same original bytes several ways side by side, so you pick the version where names and currency symbols read correctly. Choosing one re-reads the original bytes; nothing is guessed silently.</p>
          </section>
        </div>

        <section className={styles.limits} aria-labelledby="csv-repair-limits-title">
          <div>
            <p className={styles.eyebrow}>HONEST LIMITS</p>
            <h2 id="csv-repair-limits-title">What this tool won’t do.</h2>
          </div>
          <ul>
            <li><strong>Recover lost data.</strong> If zeros or digits were removed before the file reached you, only the source system has them.</li>
            <li><strong>Open workbooks or PDFs.</strong> It reads CSV, TSV and delimited text, optionally inside a .gz or single-file .zip. XLSX, XLS, PDF and images are refused with an explanation.</li>
            <li><strong>Guess your intent.</strong> Types, padding lengths, date formats and row removals are suggestions until you apply them, and every applied step can be undone.</li>
            <li><strong>Keep your work.</strong> Your data isn’t stored after you close the tab. Export the repaired file, and save a recipe (column rules only) if you repeat the same cleanup every week.</li>
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="csv-repair-guides-title">
          <p className={styles.eyebrow}>RELATED GUIDES</p>
          <h2 id="csv-repair-guides-title">Go deeper on CSV and Excel problems.</h2>
          <ul className={styles.guides}>
            {guides.map((guide) => (
              <li key={guide.href}>
                <Link href={guide.href} prefetch={false}>
                  <strong>{guide.title}</strong>
                  <span>{guide.text}</span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.callout}><FileSpreadsheet size={20} aria-hidden="true" /><span>Comparing two exports instead of repairing one? Use the <Link href="/tools/csv-diff" prefetch={false}>CSV diff checker</Link> to match rows by ID. Starting from an API response? Convert it with <Link href="/tools/json-to-csv" prefetch={false}>JSON to CSV</Link>, then repair the result here.</span></p>
        </section>

        <section className={styles.section} aria-labelledby="csv-repair-faq-title">
          <p className={styles.eyebrow}>QUESTIONS</p>
          <h2 id="csv-repair-faq-title">CSV repair FAQ.</h2>
          <div className={styles.faqs}>
            {faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}
          </div>
        </section>
        <p className={styles.endnote}>Built by ByteVerse. CSV parsing follows <a href="https://www.rfc-editor.org/rfc/rfc4180" target="_blank" rel="noopener noreferrer">RFC 4180</a> conventions, with clear reports where real files break them. No claim of recovering lost data or certifying spreadsheet safety. <Link href="/privacy" prefetch={false}>Privacy details</Link>.</p>
      </div>
    </div>
  );
}
