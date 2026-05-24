import type { Metadata } from "next";
import { HtmlTagTool } from "./html-tag-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "HTML Tag Generator & Remover",
  title: "HTML Tag Generator & Remover - Online Tool",
  description:
    "Generate HTML tags from plain text or strip all tags from HTML code. Wrap text in paragraphs, headings, lists, bold, links, and more. 100% free, private, runs in your browser.",
  slug: "html-tag-generator",
  keywords: [
    "html tag generator",
    "html tag remover",
    "strip html tags",
    "remove html tags",
    "text to html",
    "html to text",
    "wrap text in html",
    "html tag stripper",
  ],
  faqs: [
    {
      question: "How does the tag generator work?",
      answer:
        "Paste plain text and click any tag button to wrap it. For block tags like paragraphs, each text block separated by blank lines becomes a separate element. For lists, each line becomes a list item. You can also use custom tags with attributes.",
    },
    {
      question: "How does tag removal work?",
      answer:
        "Paste HTML code and click Remove All Tags. The tool strips every HTML tag while optionally preserving line breaks, link URLs, and list formatting. Common HTML entities like &amp;, &lt;, &gt; are also decoded.",
    },
    {
      question: "Is my content safe?",
      answer:
        "Yes. Everything runs in your browser using JavaScript. No text or HTML is sent to any server, stored, or shared. Your content stays completely private.",
    },
    {
      question: "Can I use custom HTML tags?",
      answer:
        "Yes. Expand the Custom Tag section in Generate mode to specify any tag name and attributes. This works with standard HTML tags, semantic tags, or even custom element names.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function HtmlTagGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          HTML Tag Generator & Remover
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Add HTML tags to plain text or strip tags from HTML code. Supports
          paragraphs, headings, lists, links, bold, italic, custom tags, and
          more.
        </p>
      </div>
      <HtmlTagTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use</h2>
        <h3>Generate Tags</h3>
        <ol>
          <li>Paste your plain text in the input area</li>
          <li>Click any tag button to wrap your text in that HTML element</li>
          <li>
            Use <strong>Auto Paragraphs</strong> to convert text blocks into
            &lt;p&gt; tags automatically
          </li>
          <li>
            For lists, put each item on a separate line, then click{" "}
            <strong>Bullet List</strong> or <strong>Numbered List</strong>
          </li>
          <li>Copy the generated HTML or view the live preview</li>
        </ol>
        <h3>Remove Tags</h3>
        <ol>
          <li>Switch to the &ldquo;Remove Tags&rdquo; tab</li>
          <li>Paste your HTML code</li>
          <li>Choose which formatting to preserve (line breaks, links, lists)</li>
          <li>
            Click <strong>Remove All Tags</strong> to get clean plain text
          </li>
        </ol>
        <h2>Supported Tags</h2>
        <p>
          The generator supports 12 built-in tags: paragraph, h1, h2, h3, bold
          (strong), italic (em), underline, link, code, blockquote, div, and
          span. Plus auto-paragraph, bullet lists, numbered lists, line breaks,
          and custom tags with attributes.
        </p>
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
