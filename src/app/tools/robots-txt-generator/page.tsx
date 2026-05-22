import type { Metadata } from "next";
import { RobotsTxtGeneratorTool } from "./robots-txt-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "robots.txt Generator",
  title: "robots.txt Generator - Free Robots.txt File Builder",
  description: "Generate robots.txt files with a visual builder. Add user-agent rules, sitemaps, and crawl delays. Includes presets for WordPress, AI bot blocking, and more.",
  slug: "robots-txt-generator",
  keywords: ["robots.txt generator", "robots.txt builder", "robots txt creator", "block ai bots", "crawl delay", "user agent rules"],
  faqs: [
    { question: "What is robots.txt?", answer: "robots.txt is a text file at the root of your website that tells search engine crawlers which pages they can or cannot access. It follows the Robots Exclusion Protocol." },
    { question: "Can robots.txt block AI crawlers?", answer: "Yes. You can add rules for user agents like GPTBot, CCBot, and Google-Extended to prevent AI companies from scraping your content for training data." },
    { question: "Does robots.txt prevent indexing?", answer: "No. robots.txt only controls crawling, not indexing. To prevent indexing, use a noindex meta tag or X-Robots-Tag header instead." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function RobotsTxtGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">robots.txt Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Build your robots.txt file visually. Add user-agent groups, allow/disallow rules, sitemaps, and crawl delays with one-click presets.</p>
      </div>
      <RobotsTxtGeneratorTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What is robots.txt?</h2>
        <p>robots.txt is a text file placed at the root of your website that tells search engine crawlers which pages they can or cannot access. It&apos;s part of the Robots Exclusion Protocol.</p>
        <h2>Common Use Cases</h2>
        <ul>
          <li>Block admin or private directories from indexing</li>
          <li>Prevent AI crawlers (GPTBot, CCBot) from scraping your content</li>
          <li>Set crawl delays to reduce server load</li>
          <li>Point crawlers to your sitemap</li>
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
