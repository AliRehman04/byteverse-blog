import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, FileCheck2, FileSpreadsheet, LockKeyhole } from "lucide-react";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { InvoiceWorkspaceHost } from "./invoice-workspace-host";

const toolConfig = {
  name: "Invoice PDF to Excel",
  title: "Invoice PDF to Excel, without the busywork.",
  description: "Extract selectable-text invoice PDFs into a reviewed Excel or CSV register. Batch up to 20 files locally, check flagged fields and export free. No OCR or signup.",
  slug: "invoice-pdf-to-excel",
  keywords: ["invoice pdf to excel", "extract invoice data from pdf to excel", "invoice data extraction to excel", "pdf invoice to csv", "bulk pdf to excel"],
  applicationCategory: "BusinessApplication",
  audience: "Bookkeepers and small businesses",
  featureList: [
    "Local batch processing of up to 20 selectable-text invoice PDFs",
    "Literal English labels and reusable custom label mapping templates",
    "Editable summary fields with source evidence and explicit invoice review",
    "Missing-field, ambiguity, duplicate and arithmetic checks",
    "XLSX with Invoices, Currency totals and Review notes sheets",
    "CSV export of reviewed, included invoice rows",
  ],
  faqs: [
    {
      question: "Can this convert scans or arbitrary PDF tables?",
      answer: "No. It extracts summary fields from selectable-text digital invoices using literal English or custom labels. There is no OCR, AI or line-item extraction.",
    },
    {
      question: "Is bulk invoice conversion really free?",
      answer: "Yes. Processing, review, templates and XLSX/CSV exports are free, with no signup, subscription or surprise billing. The stated batch limits apply.",
    },
    {
      question: "Can I export an invoice with warnings?",
      answer: "Errors block review. Warnings require inspection and acknowledgement before you mark an invoice reviewed. Passing checks is not proof of accounting accuracy.",
    },
    {
      question: "What do the Excel and CSV downloads include?",
      answer: "XLSX includes Invoices, Currency totals and Review notes sheets. CSV includes only Invoices, with its review-notes column. Only valid, reviewed, included rows export.",
    },
    {
      question: "Are invoices uploaded or saved automatically?",
      answer: "No. PDFs and rows stay in isolated workspace memory, not browser storage, servers or AI. Reloading clears unsaved work, not downloaded exports.",
    },
  ],
};

const baseMetadata = generateToolMetadata(toolConfig);
const socialImage = {
  url: `/tools/${toolConfig.slug}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "Invoice PDF to Excel by ByteVerse: three fictional USD and EUR invoices, one flagged total, and a reviewed spreadsheet workflow.",
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

export default function InvoicePdfToExcelPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <ToolJsonLd config={toolConfig} />

      <header className="relative isolate overflow-hidden rounded-3xl border border-teal-900/10 bg-linear-to-br from-slate-50 via-white to-teal-50 p-6 dark:border-teal-300/15 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 sm:p-8 lg:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-30" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] lg:items-center lg:gap-10">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-teal-700 dark:text-teal-300">DOCUMENTS → DECISIONS</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl">
              Invoice PDF to Excel,{" "}
              <span className="block text-teal-700 dark:text-teal-300">without the busywork.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Turn digital invoices into a tidy register. Check the source, fix uncertain fields and export. For bookkeepers and small businesses—not universal PDF conversion.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-700 dark:text-slate-200">
              <li className="flex items-center gap-1.5"><FileCheck2 size={16} aria-hidden="true" className="text-teal-600 dark:text-teal-300" />Review before export</li>
              <li className="flex items-center gap-1.5"><LockKeyhole size={16} aria-hidden="true" className="text-teal-600 dark:text-teal-300" />Files stay on your device</li>
              <li className="flex items-center gap-1.5"><FileSpreadsheet size={16} aria-hidden="true" className="text-teal-600 dark:text-teal-300" />Real .xlsx + CSV</li>
            </ul>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a href="#invoice-converter" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600">
                Start converting invoices <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a href="#how-it-works" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 dark:text-slate-200 dark:hover:text-teal-300">See how it works</a>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">All free. No signup. No surprise billing. Desktop recommended.</p>
          </div>

          <figure className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/5 sm:p-6">
            <figcaption className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><FileSpreadsheet size={21} aria-hidden="true" /></span>
              <div><p className="text-sm font-semibold">A clearer invoice register</p><p className="mt-0.5 text-xs text-slate-500">Illustration · fictional demo data</p></div>
            </figcaption>
            <table className="mt-5 w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-[10px] tracking-wider text-slate-500 uppercase"><tr><th scope="col" className="pb-2 font-medium">Invoice</th><th scope="col" className="pb-2 text-right font-medium">Invoice total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { supplier: "Northstar Design Studio", number: "DEMO-001", amount: "USD 440.00" },
                  { supplier: "Harbor Office Supplies", number: "DEMO-002", amount: "EUR 150.60" },
                  { supplier: "Northstar Design Studio", number: "DEMO-003", amount: "USD 250.00" },
                ].map((invoice) => (
                  <tr key={invoice.number}>
                    <td className="py-3 pr-3"><span className="block font-medium">{invoice.supplier}</span><span className="mt-1 block text-[11px] text-slate-500">{invoice.number}</span></td>
                    <td className="py-3 text-right whitespace-nowrap tabular-nums">{invoice.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900"><strong>Check DEMO-003:</strong> 200.00 + 20.00 does not equal 250.00.</p>
            <p className="mt-3 text-[11px] text-slate-500">USD and EUR stay separate. No combined total.</p>
          </figure>
        </div>
      </header>

      <div className="mt-8"><InvoiceWorkspaceHost /></div>

      <nav aria-label="Invoice converter guide" className="mt-8 flex flex-wrap gap-x-6 gap-y-1 border-b border-border pb-4 text-sm font-medium text-muted-foreground">
        {[
          ["#how-it-works", "How it works"],
          ["#supported-files", "Supported files"],
          ["#data-fields", "Data fields"],
          ["#faqs", "FAQs"],
        ].map(([href, label]) => <a key={href} href={href} className="inline-flex min-h-11 items-center hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 dark:hover:text-teal-300">{label}</a>)}
      </nav>

      <section id="how-it-works" aria-labelledby="how-heading" className="mt-10 scroll-mt-24">
        <h2 id="how-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">Extract invoice data from PDF to Excel in three steps</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: "Add your PDFs", text: "Open the converter, then select or drop files inside it. Use one selectable-text invoice per PDF." },
            { title: "Check, correct, review", text: "Compare fields with the original or source text. Resolve errors, acknowledge checked warnings and mark each invoice reviewed. Edits clear its review." },
            { title: "Export the included rows", text: "Choose XLSX or CSV. Only valid, reviewed, included invoices export; failed, excluded and unreviewed files are omitted." },
          ].map((step, index) => <li key={step.title} className="rounded-2xl border border-border bg-card p-5"><span className="text-xs font-bold tracking-wider text-teal-700 dark:text-teal-300">0{index + 1}</span><h3 className="mt-2 font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p></li>)}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Try sample invoices</strong> creates three real synthetic PDFs through the same reader: matching USD/EUR examples and one deliberate total mismatch. These are not real transactions.</p>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section id="supported-files" aria-labelledby="supported-heading" className="scroll-mt-24">
          <h2 id="supported-heading" className="text-2xl font-semibold tracking-tight">Start with a selectable-text PDF</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Open your PDF, select an invoice number and copy it into a text editor. Readable pasted text is a first check, not a guarantee every layout will parse.</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Scans, handwriting, password-protected or copy-restricted files, credit notes and multi-invoice PDFs are unsupported. Damaged files, unusual fonts and complex layouts may fail. Request an authorized digital export.</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Limits: <strong className="text-foreground">20 files · 10 MB each · 50 MB active session · 15 pages per PDF · 30 seconds per file.</strong> Failed and excluded files count until removed. Use a current desktop browser.</p>
        </section>

        <section id="data-fields" aria-labelledby="fields-heading" className="scroll-mt-24">
          <h2 id="fields-heading" className="text-2xl font-semibold tracking-tight">Summary fields, not line items</h2>
          <dl className="mt-4 space-y-3 text-sm leading-relaxed">
            <div><dt className="font-semibold">Required</dt><dd className="text-muted-foreground">Supplier, invoice number, invoice date, currency and invoice total.</dd></div>
            <div><dt className="font-semibold">Optional</dt><dd className="text-muted-foreground">Subtotal, tax, discount and shipping. Exports include the source filename, known source pages and review notes.</dd></div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Auto flags dates such as 03/04/2026, amounts such as 1,234 and bare $ symbols. Choose the source date/number format and confirm an ISO currency. Check suggested suppliers against the seller, not the customer.</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Download and import JSON label templates for repeat layouts. Each literal custom label replaces that field&apos;s defaults. Templates contain a name and labels, not extracted financial values; nothing is automatically saved.</p>
        </section>
      </div>

      <section aria-labelledby="handoff-heading" className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 id="handoff-heading" className="text-2xl font-semibold tracking-tight">Keep the checks with the spreadsheet</h2>
        <div className="mt-4 grid gap-5 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
          <p>With subtotal and tax present, the check compares subtotal + tax + shipping − discount with the total. Differences beyond one currency minor unit trigger warnings. Blank tax is not assumed zero. Possible duplicates are flagged, not removed. No accuracy score is assigned.</p>
          <p>XLSX preserves identifiers with explicit text cells. CSV readers may reinterpret leading zeros, dates or formula-like text; check import settings. Neither format tracks payments or outstanding balances. Remove samples before exporting real transactions.</p>
        </div>
      </section>

      <section aria-labelledby="privacy-heading" className="mt-12">
        <h2 id="privacy-heading" className="text-2xl font-semibold tracking-tight">Local processing, with a clear boundary</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>The opaque sandbox allows scripts and downloads, not same-origin access. Libraries, fonts and its Blob PDF worker are bundled; <code>connect-src &apos;none&apos;</code> blocks network connections. No third-party scripts run inside. PDFs and rows stay in memory; only resize height returns to this page.</p>
          <p>The surrounding site uses analytics and advertising: see our <Link href="/privacy" prefetch={false} className="font-medium text-teal-700 underline underline-offset-4 dark:text-teal-300">privacy policy</Link>, <Link href="/terms" prefetch={false} className="font-medium text-teal-700 underline underline-offset-4 dark:text-teal-300">terms</Link> and <a href="https://policies.google.com/privacy" rel="noreferrer" className="font-medium text-teal-700 underline underline-offset-4 dark:text-teal-300">Google&apos;s privacy policy</a>. This is not an absolute privacy guarantee: browser extensions and operating-system security are outside the boundary. Download what you need before clearing or reloading.</p>
        </div>
      </section>

      <section id="faqs" aria-labelledby="faq-heading" className="mt-12 scroll-mt-24">
        <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card px-5 sm:px-6">
          {toolConfig.faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 [&::-webkit-details-marker]:hidden">{faq.question}<ChevronDown size={17} aria-hidden="true" className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
              <p className="max-w-4xl pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}