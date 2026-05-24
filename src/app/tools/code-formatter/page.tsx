import type { Metadata } from "next";
import { CodeFormatterTool } from "./code-formatter-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Code Formatter & Beautifier",
  title: "Code Formatter - JSON, HTML, CSS, JS & SQL",
  description: "Format, beautify, and minify code instantly. Supports JSON, HTML, CSS, JavaScript, SQL, and XML. Free online code formatter — no sign-up required.",
  slug: "code-formatter",
  keywords: ["code formatter", "code beautifier", "json formatter", "html formatter", "css formatter", "javascript formatter", "sql formatter", "code minifier", "online code formatter"],
  faqs: [
    { question: "What languages does this code formatter support?", answer: "JSON, HTML, CSS, JavaScript, SQL, and XML. More languages coming soon." },
    { question: "Is my code safe?", answer: "Yes. All formatting runs 100% in your browser. No code is sent to any server." },
    { question: "Can I minify code too?", answer: "Yes. Click the Minify button to compress your code by removing whitespace, comments, and unnecessary characters." },
    { question: "Does it auto-detect the language?", answer: "Yes. When you paste code, the tool tries to detect whether it's JSON, HTML, CSS, SQL, or XML and selects the right formatter automatically." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function CodeFormatterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Code Formatter & Beautifier
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Paste your code to format, beautify, or minify it instantly. Supports JSON, HTML, CSS, JavaScript, SQL, and XML.
        </p>
      </div>

      <CodeFormatterTool />

      {/* SEO content */}
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This Code Formatter</h2>
        <ol>
          <li>Select your programming language from the dropdown</li>
          <li>Paste your code in the input area (or click Paste)</li>
          <li>Choose your indent size (2 or 4 spaces)</li>
          <li>Click <strong>Format</strong> to beautify or <strong>Minify</strong> to compress</li>
          <li>Click <strong>Copy</strong> to copy the result</li>
        </ol>

        <h2>Supported Languages</h2>
        <ul>
          <li><strong>JSON</strong> — Format, validate, and minify JSON data</li>
          <li><strong>HTML</strong> — Beautify HTML with proper tag indentation</li>
          <li><strong>CSS</strong> — Format stylesheets with clean property alignment</li>
          <li><strong>JavaScript</strong> — Indent JS code with brace matching</li>
          <li><strong>SQL</strong> — Uppercase keywords and indent clauses</li>
          <li><strong>XML</strong> — Format XML with proper nesting</li>
        </ul>

        <h2>Why Format Your Code?</h2>
        <p>
          Properly formatted code is easier to read, debug, and maintain. Whether you're cleaning up
          minified production code or formatting a messy config file, this tool helps you get clean,
          readable output in seconds.
        </p>

        <h2>Frequently Asked Questions</h2>
        {toolConfig.faqs.map((faq) => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
