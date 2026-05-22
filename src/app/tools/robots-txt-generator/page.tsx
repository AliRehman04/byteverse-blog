import type { Metadata } from "next";
import { RobotsTxtGeneratorTool } from "./robots-txt-generator-tool";

export const metadata: Metadata = {
  title: "robots.txt Generator - Free Robots.txt File Builder",
  description: "Generate robots.txt files with a visual builder. Add user-agent rules, sitemaps, and crawl delays. Includes presets for WordPress, AI bot blocking, and more.",
  keywords: ["robots.txt generator", "robots.txt builder", "robots txt creator", "block ai bots", "crawl delay", "user agent rules"],
  alternates: { canonical: "https://www.byteverse.fyi/tools/robots-txt-generator" },
};

export default function RobotsTxtGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
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
    </main>
  );
}
