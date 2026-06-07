import type { Metadata } from "next";
import Link from "next/link";
import { MetaTagGeneratorTool } from "./meta-tag-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Meta Tag Generator",
  title: "SEO Meta Tags Generator - Free Meta Tag Tool",
  description: "Generate SEO meta tags, title tags, meta descriptions, Open Graph tags, Twitter cards, and canonical tags for free. Preview and copy clean HTML.",
  slug: "meta-tag-generator",
  keywords: ["meta tag generator", "seo meta tags", "open graph generator", "html meta tags", "seo tool", "meta description generator"],
  faqs: [
    { question: "How long should my title tag be?", answer: "Keep it under 60 characters. Google truncates longer titles in search results." },
    { question: "How long should my meta description be?", answer: "Aim for 150-160 characters. This gives you enough space to describe the page without getting cut off." },
    { question: "Do meta tags affect SEO rankings?", answer: "Title tags directly affect rankings. Meta descriptions do not affect rankings directly but influence click-through rates, which matters a lot." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function MetaTagGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          SEO Meta Tags Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate SEO meta tags, title tags, meta descriptions, Open Graph
          tags, Twitter cards, and canonical tags with instant previews.
        </p>
      </div>

      <MetaTagGeneratorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What Are Meta Tags?</h2>
        <p>
          Meta tags are HTML elements that tell search engines and social media
          platforms what your page is about. They control how your page appears
          in Google search results, Twitter cards, Facebook shares, and more.
        </p>

        <h2>Essential Meta Tags for SEO</h2>
        <ul>
          <li><strong>Title tag</strong> - The clickable headline in search results (50-60 chars)</li>
          <li><strong>Meta description</strong> - The summary below the title (150-160 chars)</li>
          <li><strong>Open Graph tags</strong> - Controls appearance on Facebook, LinkedIn</li>
          <li><strong>Twitter Card tags</strong> - Controls appearance on Twitter/X</li>
          <li><strong>Canonical URL</strong> - Prevents duplicate content issues</li>
          <li><strong>Viewport</strong> - Ensures mobile responsiveness</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>How long should my title tag be?</h3>
        <p>Keep it under 60 characters. Google truncates longer titles in search results.</p>
        <h3>How long should my meta description be?</h3>
        <p>Aim for 150-160 characters. This gives you enough space to describe the page without getting cut off.</p>
        <h3>Do meta tags affect SEO rankings?</h3>
        <p>Title tags directly affect rankings. Meta descriptions do not affect rankings directly but influence click-through rates, which matters a lot.</p>

        <h2>Related Guide</h2>
        <p>
          Need examples before copying tags? Read the full{" "}
          <Link href="/blog/seo-meta-tags-generator-guide-2026">
            SEO meta tags generator guide
          </Link>{" "}
          for title tag formulas, meta description examples, Open Graph tags,
          canonical URLs, robots tags, and schema tips.
        </p>
      </section>
    </main>
  );
}
