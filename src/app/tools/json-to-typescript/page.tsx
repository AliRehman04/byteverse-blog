import type { Metadata } from "next";
import { JsonToTypeScriptTool } from "./json-to-typescript-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "JSON to TypeScript Converter",
  title: "JSON to TypeScript Converter - Free Online Tool",
  description: "Convert JSON objects to TypeScript interfaces or types instantly. Supports nested objects, arrays, optional props, readonly modifiers, and export declarations. 100% client-side.",
  slug: "json-to-typescript",
  keywords: ["json to typescript", "json to ts", "json to typescript converter", "json to interface", "json to type", "generate typescript from json", "typescript interface generator"],
  faqs: [
    { question: "How does the JSON to TypeScript converter work?", answer: "Paste any valid JSON and the tool will automatically detect the data types for each field, handle nested objects by creating separate interfaces, and generate clean TypeScript code." },
    { question: "Can it handle nested JSON objects?", answer: "Yes. Nested objects are converted into separate named interfaces. For example, an 'address' field containing an object will generate a separate 'Address' interface automatically." },
    { question: "What is the difference between type and interface?", answer: "Both define object shapes in TypeScript. Interfaces support declaration merging and are traditional. Types are more flexible and support unions, intersections, and mapped types. Toggle the option to choose your preference." },
    { question: "Does it support JSON arrays?", answer: "Yes. If you paste a JSON array of objects, the tool merges all keys from every item to generate a complete interface covering all possible fields." },
    { question: "Is my data safe?", answer: "Absolutely. The conversion runs 100% in your browser. No data is sent to any server." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function JsonToTypeScriptPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">JSON to TypeScript Converter</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Generate TypeScript interfaces or types from any JSON data. Supports nested objects, arrays, and customizable output options.</p>
      </div>
      <JsonToTypeScriptTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How It Works</h2>
        <p>Paste any valid JSON object or array and the tool will analyze the structure, detect data types for each field, and generate clean TypeScript interfaces. Nested objects are automatically extracted into separate named interfaces.</p>
        <h2>Features</h2>
        <ul>
          <li>Automatic type detection for strings, numbers, booleans, arrays, and nested objects</li>
          <li>Nested object extraction into separate interfaces</li>
          <li>Array type inference with union types for mixed arrays</li>
          <li>Toggle between <code>interface</code> and <code>type</code> declarations</li>
          <li>Optional properties, readonly modifiers, and export declarations</li>
          <li>Custom root interface name</li>
          <li>File upload and <code>.d.ts</code> download</li>
          <li>100% client-side — your data never leaves your browser</li>
        </ul>
        <h2>When to Use This Tool</h2>
        <p>Use this converter when working with API responses, configuration files, or any JSON data that you need to type in a TypeScript project. Instead of manually writing interfaces, paste the JSON and get production-ready TypeScript types in seconds.</p>
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
