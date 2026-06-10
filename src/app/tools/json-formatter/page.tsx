import type { Metadata } from "next";
import { JsonFormatterTool } from "./json-formatter-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "JSON Formatter & Validator",
  title: "JSON Formatter & Validator Online - Free Tool",
  description: "Format, validate, and minify JSON instantly. Free online JSON formatter with syntax highlighting, error detection, and one-click copy.",
  slug: "json-formatter",
  keywords: ["json formatter", "json validator", "json beautifier", "json minifier", "format json online", "json tool"],
  faqs: [
    { question: "Is my data safe?", answer: "Yes. Everything runs in your browser. No data is sent to any server." },
    { question: "What JSON errors does it catch?", answer: "Missing commas, extra commas, unquoted keys, mismatched brackets, invalid values, and more." },
    { question: "Can I use this for large JSON files?", answer: "This tool handles files up to several MB comfortably. For very large files (50MB+), use a desktop tool." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function JsonFormatterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          JSON Formatter & Validator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Paste your JSON to format, validate, or minify it instantly. Catches
          errors and shows exactly where they are.
        </p>
      </div>

      <JsonFormatterTool />

      {/* SEO content */}
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This JSON Formatter</h2>
        <ol>
          <li>Paste or type your JSON in the input area</li>
          <li>Click <strong>Format</strong> to beautify or <strong>Minify</strong> to compress</li>
          <li>Errors appear instantly with line and position info</li>
          <li>Click <strong>Copy</strong> to copy the result to your clipboard</li>
        </ol>

        <h2>What This Tool Does</h2>
        <ul>
          <li><strong>Format/Beautify</strong> — Adds proper indentation (2 or 4 spaces) so nested objects and arrays are easy to read</li>
          <li><strong>Validate</strong> — Checks if your JSON is syntactically correct and pinpoints errors with line numbers</li>
          <li><strong>Minify</strong> — Strips all whitespace and newlines for the smallest possible file size, ideal for API payloads and config files</li>
        </ul>

        <h2>Why Formatting JSON Matters</h2>
        <p>Raw JSON from APIs and databases is often minified — a single line of text that is nearly impossible to read. Properly formatted JSON with indentation makes it easy to spot nested structures, find specific keys, and debug issues. Validation catches syntax errors like trailing commas, missing quotes, and mismatched brackets before they cause runtime failures in your application.</p>

        <h2>Frequently Asked Questions</h2>
        <h3>Is my data safe?</h3>
        <p>Yes. Everything runs in your browser using JavaScript. No data is sent to any server, and nothing is stored or logged.</p>
        <h3>What JSON errors does it catch?</h3>
        <p>Missing commas, trailing commas, unquoted keys, mismatched brackets and braces, invalid values, duplicate keys, and malformed Unicode escape sequences.</p>
        <h3>Can I use this for large JSON files?</h3>
        <p>This tool handles files up to several megabytes comfortably in modern browsers. For very large files (50MB+), consider using a desktop tool like VS Code or jq.</p>
      </section>
    </main>
  );
}
