import type { Metadata } from "next";
import { LlmsTxtTool } from "./llms-txt-tool";

export const metadata: Metadata = {
  title: "llms.txt Generator & Validator - Free Online Tool",
  description:
    "Generate and validate llms.txt files for your website. Check format, detect issues, and create spec-compliant files that help AI models understand your site.",
  keywords: [
    "llms.txt generator",
    "llms.txt validator",
    "llms txt checker",
    "llms.txt format",
    "ai website optimization",
    "llms txt file",
  ],
  alternates: {
    canonical: "https://www.byteverse.fyi/tools/llms-txt-generator-validator",
  },
};

export default function LlmsTxtPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          llms.txt Generator & Validator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Create a spec-compliant llms.txt file for your website, or paste an
          existing one to validate it. Helps AI models understand your site.
        </p>
      </div>

      <LlmsTxtTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What is llms.txt?</h2>
        <p>
          llms.txt is a proposed standard (by Jeremy Howard) that provides a
          markdown-formatted text file at your website root. It gives AI models
          and large language models (LLMs) concise, structured information about
          your site, similar to how robots.txt guides search engine crawlers.
        </p>

        <h2>llms.txt Format Rules</h2>
        <ul>
          <li>
            <strong>H1 heading required</strong> - The file must start with a
            title using <code># Your Site Name</code>
          </li>
          <li>
            <strong>Optional blockquote summary</strong> - A brief description
            using <code>&gt; lines</code> after the H1
          </li>
          <li>
            <strong>H2 sections</strong> - Organize content into categories
            like <code>## Main URLs</code>, <code>## Resources</code>
          </li>
          <li>
            <strong>List items only in sections</strong> - H2 sections should
            only contain list items (<code>-</code>, <code>*</code>,{" "}
            <code>+</code>, or numbered), not plain text paragraphs
          </li>
          <li>
            <strong>Markdown links</strong> - Use{" "}
            <code>[Text](https://url)</code> or bare URLs
          </li>
          <li>
            <strong>No sensitive data</strong> - Avoid exposing email addresses
            or phone numbers directly
          </li>
        </ul>

        <h2>Where to Place llms.txt</h2>
        <p>
          Put your llms.txt file at the root of your domain:{" "}
          <code>https://yourdomain.com/llms.txt</code>. Alternatively, it can
          be placed at <code>/.well-known/llms.txt</code>.
        </p>

        <h2>Frequently Asked Questions</h2>
        <h3>Is llms.txt an official web standard?</h3>
        <p>
          It is a proposed standard gaining adoption, not yet an official W3C or
          IETF standard. However, many sites already use it and AI tools are
          starting to look for it.
        </p>
        <h3>Does llms.txt affect SEO?</h3>
        <p>
          Not directly for traditional search engines. It helps AI-powered
          search and chatbots better understand your site, which may improve
          visibility in AI-generated answers.
        </p>
        <h3>Can I have both robots.txt and llms.txt?</h3>
        <p>
          Yes. They serve different purposes. robots.txt controls crawler
          access, while llms.txt provides structured information for AI models.
        </p>
      </section>
    </main>
  );
}
