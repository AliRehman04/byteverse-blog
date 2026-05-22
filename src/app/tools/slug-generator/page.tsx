import type { Metadata } from "next";
import { SlugGeneratorTool } from "./slug-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Slug Generator",
  title: "Slug Generator - Free URL Slug Converter",
  description: "Convert any text into a clean, URL-friendly slug. Customize separators, max length, prefix, and suffix. Handles accented characters, special symbols, and unicode.",
  slug: "slug-generator",
  keywords: ["slug generator", "url slug converter", "url friendly text", "slugify", "seo url generator"],
  faqs: [
    { question: "What is a URL slug?", answer: "A URL slug is the human-readable part of a web address that identifies a page. For example, in example.com/blog/my-first-post, the slug is my-first-post." },
    { question: "How long should a slug be?", answer: "Keep slugs between 3-5 words for best SEO results. Short, descriptive slugs perform better in search rankings." },
    { question: "Should I use hyphens or underscores?", answer: "Use hyphens. Google treats hyphens as word separators but treats underscores as word joiners. So my-post is read as two words while my_post is read as one." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function SlugGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Slug Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Convert any title or text into a clean, SEO-friendly URL slug. Handles special characters, accents, and unicode automatically.</p>
      </div>
      <SlugGeneratorTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What is a URL Slug?</h2>
        <p>A URL slug is the part of a web address that identifies a specific page in human-readable form. For example, in <code>example.com/blog/my-first-post</code>, the slug is <code>my-first-post</code>.</p>
        <h2>Best Practices</h2>
        <ul>
          <li>Keep slugs short and descriptive (3-5 words ideal)</li>
          <li>Use hyphens to separate words</li>
          <li>Avoid stop words (the, a, an, is) when possible</li>
          <li>Use only lowercase letters, numbers, and hyphens</li>
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
