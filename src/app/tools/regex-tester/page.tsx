import type { Metadata } from "next";
import { RegexTesterTool } from "./regex-tester-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Regex Tester",
  title: "Regex Tester Online - Free Regular Expression Tester & Debugger",
  description: "Test and debug regular expressions in real time. Live highlighting, match details, capture groups, replace mode, and common pattern presets. Free, runs in your browser.",
  slug: "regex-tester",
  keywords: ["regex tester", "regex tester online", "regular expression tester", "regex debugger", "regex match", "regex replace", "test regex", "regex validator"],
  faqs: [
    { question: "Is my data safe?", answer: "Yes. Everything runs entirely in your browser. No data is sent to any server." },
    { question: "Which regex flavor does this use?", answer: "This tool uses JavaScript's built-in RegExp engine, which supports ES2024 features including named groups, lookbehind assertions, and the dotall flag." },
    { question: "Can I test multiline patterns?", answer: "Yes. Enable the Multiline (m) flag to make ^ and $ match at line boundaries instead of string boundaries." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function RegexTesterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Regex Tester & Debugger
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test regular expressions in real time with live highlighting, match
          details, capture groups, and replace functionality.
        </p>
      </div>

      <RegexTesterTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This Regex Tester</h2>
        <ol>
          <li>Type your regular expression pattern in the input field</li>
          <li>Set flags (global, case-insensitive, multiline, etc.)</li>
          <li>Enter or paste your test string below</li>
          <li>Matches are highlighted instantly with full details</li>
          <li>Use the Replace section to test substitutions</li>
        </ol>

        <h2>Features</h2>
        <ul>
          <li><strong>Live Highlighting</strong> — Matches are color-coded in your test string as you type</li>
          <li><strong>Match Details Table</strong> — See every match with index position and capture groups</li>
          <li><strong>Named Groups</strong> — Full support for named capture groups</li>
          <li><strong>Replace Mode</strong> — Test regex replacements with backreferences ($1, $2)</li>
          <li><strong>Common Presets</strong> — One-click patterns for email, URL, IP, phone, dates, and more</li>
          <li><strong>Quick Reference</strong> — Built-in regex cheat sheet</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is my data safe?</h3>
        <p>Yes. Everything runs entirely in your browser. No data is sent to any server.</p>
        <h3>Which regex flavor does this use?</h3>
        <p>This tool uses JavaScript&apos;s built-in RegExp engine, which supports ES2024 features including named groups, lookbehind assertions, and the dotall flag.</p>
        <h3>Can I test multiline patterns?</h3>
        <p>Yes. Enable the Multiline (m) flag to make ^ and $ match at line boundaries instead of string boundaries.</p>
      </section>
    </main>
  );
}
