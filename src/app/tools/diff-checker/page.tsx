import type { Metadata } from "next";
import { DiffCheckerTool } from "./diff-checker-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Diff Checker",
  title: "Diff Checker Online - Free Text Compare & Difference Finder",
  description: "Compare two texts side by side and find differences instantly. Line-by-line diff with additions, deletions, and unchanged lines. Free, private, runs in your browser.",
  slug: "diff-checker",
  keywords: ["diff checker", "diff checker online", "text compare", "text diff", "compare text online", "difference finder", "code diff", "file compare"],
  faqs: [
    { question: "Is my data safe?", answer: "Yes. All comparisons are done entirely in your browser. No text is sent to any server." },
    { question: "Can I compare code files?", answer: "Yes. This tool works with any text including source code. It performs a line-by-line comparison using an LCS (Longest Common Subsequence) algorithm." },
    { question: "Is there a size limit?", answer: "There is no hard limit, but very large texts (100,000+ lines) may slow down your browser since the diff is computed client-side." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function DiffCheckerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Diff Checker — Text Compare Tool
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Compare two texts side by side. See additions, deletions, and
          unchanged lines with line numbers. Perfect for code reviews and
          document comparisons.
        </p>
      </div>

      <DiffCheckerTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This Diff Checker</h2>
        <ol>
          <li>Paste the original text in the left panel</li>
          <li>Paste the modified text in the right panel</li>
          <li>Differences are highlighted instantly — green for additions, red for deletions</li>
          <li>Use options to ignore whitespace or case differences</li>
          <li>Click Copy Diff to copy the unified diff output</li>
        </ol>

        <h2>Features</h2>
        <ul>
          <li><strong>Line-by-Line Diff</strong> — See exactly which lines were added, removed, or unchanged</li>
          <li><strong>Dual Line Numbers</strong> — Left and right line numbers for easy navigation</li>
          <li><strong>Ignore Whitespace</strong> — Toggle to ignore leading/trailing whitespace differences</li>
          <li><strong>Ignore Case</strong> — Toggle to make comparison case-insensitive</li>
          <li><strong>Swap Texts</strong> — Quickly swap original and modified texts</li>
          <li><strong>Copy Diff</strong> — Copy the diff in standard unified format</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is my data safe?</h3>
        <p>Yes. All comparisons are done entirely in your browser. No text is sent to any server.</p>
        <h3>Can I compare code files?</h3>
        <p>Yes. This tool works with any text including source code. It performs a line-by-line comparison using an LCS (Longest Common Subsequence) algorithm.</p>
        <h3>Is there a size limit?</h3>
        <p>There is no hard limit, but very large texts (100,000+ lines) may slow down your browser since the diff is computed client-side.</p>
      </section>
    </main>
  );
}
