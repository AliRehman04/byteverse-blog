import type { Metadata } from "next";
import { SeoTitleAnalyzerTool } from "./seo-title-analyzer-tool";
import { ToolJsonLd, generateToolMetadata } from "@/lib/tool-seo";

const toolConfig = {
  name: "SEO Title Checker",
  title: "SEO Title Checker - Free Title & Headline Analyzer",
  description:
    "Check SEO titles free online: score length, word count, intent words, specificity, and click potential. Instant title check for blog posts and pages.",
  slug: "seo-title-analyzer",
  keywords: [
    "seo title checker",
    "seo title check",
    "title checker",
    "seo title checker free online",
    "seo headline checker",
    "headline checker",
    "seo title analyzer",
    "blog title checker",
    "title analyzer",
    "seo title preview",
    "title optimizer tool",
    "seo title score",
  ],
  faqs: [
    {
      question: "How do I check my SEO title for free?",
      answer: "Paste your title into the checker above. It instantly scores length, word count, intent words, specificity, and keyword stuffing risk — no login, no limits, free online.",
    },
    {
      question: "What makes a good SEO title?",
      answer: "A strong SEO title is specific, matches search intent, stays readable in search results, and gives people a clear reason to click.",
    },
    {
      question: "How long should an SEO title be?",
      answer: "A practical target is around 45 to 65 characters. That range often balances readability with enough detail to improve click-through rate.",
    },
    {
      question: "Do numbers help blog titles?",
      answer: "Often yes. Numbers can make a title feel more concrete and easier to scan, especially in list posts, checklists, and step-by-step guides.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function SeoTitleAnalyzerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <ToolJsonLd config={toolConfig} />
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">SEO Title Checker & Analyzer</h1>
        <p className="text-muted-foreground">
          Check SEO titles before you publish — free and online. This tool scores your headline for length, clarity, search intent, and click potential.
        </p>
      </div>

      <SeoTitleAnalyzerTool />

      <section className="prose prose-neutral mx-auto mt-16 max-w-3xl dark:prose-invert">
        <h2>Why Title Optimization Matters</h2>
        <p>
          If your pages get impressions but very few clicks, the title is often part of the problem. A clearer headline can improve click-through rate without changing the entire article.
        </p>

        <h2>What This Tool Checks</h2>
        <ul>
          <li>Character count for search result readability</li>
          <li>Word count for clarity and scannability</li>
          <li>Intent phrases like best, how, guide, review, and checklist</li>
          <li>Specificity signals such as numbers or the current year</li>
          <li>Basic keyword stuffing risk</li>
        </ul>
      </section>

      <section className="prose prose-neutral mx-auto mt-12 max-w-3xl dark:prose-invert">
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