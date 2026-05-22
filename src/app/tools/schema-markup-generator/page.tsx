import type { Metadata } from "next";
import { SchemaMarkupGeneratorTool } from "./schema-markup-generator-tool";

export const metadata: Metadata = {
  title: "Schema Markup Generator - Free JSON-LD Structured Data Builder",
  description: "Generate JSON-LD structured data markup for Article, FAQ, HowTo, Product, LocalBusiness, Breadcrumb, Person, and Organization schemas. Free visual builder.",
  keywords: ["schema markup generator", "json-ld generator", "structured data", "rich snippets", "faq schema", "article schema", "product schema"],
  alternates: { canonical: "https://www.byteverse.fyi/tools/schema-markup-generator" },
};

export default function SchemaMarkupGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
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
    </main>
  );
}
