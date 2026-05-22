import type { Metadata } from "next";
import { SchemaMarkupGeneratorTool } from "./schema-markup-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Schema Markup Generator",
  title: "Schema Markup Generator - Free JSON-LD Structured Data Builder",
  description: "Generate JSON-LD structured data markup for Article, FAQ, HowTo, Product, LocalBusiness, Breadcrumb, Person, and Organization schemas. Free visual builder.",
  slug: "schema-markup-generator",
  keywords: ["schema markup generator", "json-ld generator", "structured data", "rich snippets", "faq schema", "article schema", "product schema"],
  faqs: [
    { question: "What is schema markup?", answer: "Schema markup (structured data) is code added to your pages that helps search engines understand your content better. It can enable rich results like FAQ dropdowns, star ratings, and recipe cards in Google Search." },
    { question: "Which format should I use?", answer: "Google recommends JSON-LD, which is what this tool generates. JSON-LD is easier to implement and maintain than Microdata or RDFa alternatives." },
    { question: "How do I test my schema markup?", answer: "Use Google's Rich Results Test (search.google.com/test/rich-results) to validate your markup and see if it qualifies for rich results." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function SchemaMarkupGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Schema Markup Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Build JSON-LD structured data for rich snippets in Google Search. Choose a schema type, fill in the fields, and copy the generated markup.</p>
      </div>
      <SchemaMarkupGeneratorTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What is Schema Markup?</h2>
        <p>Schema markup (structured data) is code you add to your pages to help search engines understand your content better. It can enable rich results like FAQ dropdowns, star ratings, and recipe cards in Google Search.</p>
        <h2>Supported Schema Types</h2>
        <ul>
          <li><strong>Article</strong> &mdash; Blog posts, news articles, and editorial content</li>
          <li><strong>FAQPage</strong> &mdash; Frequently asked questions with expandable answers</li>
          <li><strong>HowTo</strong> &mdash; Step-by-step tutorials and guides</li>
          <li><strong>Product</strong> &mdash; Product listings with price and reviews</li>
          <li><strong>LocalBusiness</strong> &mdash; Physical businesses with address and contact info</li>
          <li><strong>BreadcrumbList</strong> &mdash; Navigation breadcrumbs</li>
          <li><strong>Person</strong> &mdash; People profiles</li>
          <li><strong>Organization</strong> &mdash; Company or organization info</li>
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
