import type { Metadata } from "next";
import { MetaTagGeneratorTool } from "./meta-tag-generator-tool";

export const metadata: Metadata = {
  title: "Meta Tag Generator - Free SEO Meta Tags Tool",
  description:
    "Generate perfect HTML meta tags for SEO. Preview how your page looks on Google and social media. Free, instant, and easy to use.",
  keywords: [
    "meta tag generator",
    "seo meta tags",
    "open graph generator",
    "html meta tags",
    "seo tool",
    "meta description generator",
  ],
  alternates: { canonical: "https://www.byteverse.fyi/tools/meta-tag-generator" },
};

export default function MetaTagGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Meta Tag Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate SEO-optimized meta tags with Google and social media
          previews. Just fill in the fields and copy the code.
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
      </section>
    </main>
  );
}
