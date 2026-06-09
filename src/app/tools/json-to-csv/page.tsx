import type { Metadata } from "next";
import { JsonToCsvTool } from "./json-to-csv-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "JSON to CSV Converter",
  title: "JSON to CSV Converter - Free Online Tool",
  description: "Convert JSON arrays to CSV or TSV format instantly. Supports nested objects, custom delimiters, file upload, and download. Runs entirely in your browser.",
  slug: "json-to-csv",
  keywords: ["json to csv", "json to csv converter", "convert json to csv", "json to csv online", "json to tsv", "json csv converter"],
  faqs: [
    { question: "What JSON format is supported?", answer: "The tool accepts JSON arrays of objects (e.g. [{\"name\":\"Alice\"},{\"name\":\"Bob\"}]). Single objects are also supported and will be converted to a one-row CSV." },
    { question: "How are nested objects handled?", answer: "Nested objects are flattened using dot notation. For example, {\"address\":{\"city\":\"NYC\"}} becomes a column named 'address.city' with value 'NYC'." },
    { question: "Can I change the delimiter?", answer: "Yes. You can choose comma, semicolon, tab, or pipe as the delimiter. Tab-separated output is useful for pasting into spreadsheets." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function JsonToCsvPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">JSON to CSV Converter</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Convert JSON data to CSV format instantly. Upload a file or paste JSON, then download or copy the result.</p>
      </div>
      <JsonToCsvTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How It Works</h2>
        <p>Paste a JSON array of objects and the tool will extract all unique keys as column headers, then output each object as a row. Nested objects are flattened with dot notation.</p>
        <h2>Features</h2>
        <ul>
          <li>Automatic key detection across all objects</li>
          <li>Nested object flattening (dot notation)</li>
          <li>Custom delimiters: comma, semicolon, tab, pipe</li>
          <li>Proper CSV escaping for quotes and special characters</li>
          <li>File upload and download support</li>
          <li>100% client-side — your data stays private</li>
        </ul>
      </section>
      <section className="mt-12 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Frequently Asked Questions</h2>
        {toolConfig.faqs.map((faq, i) => (
          <div key={i}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
