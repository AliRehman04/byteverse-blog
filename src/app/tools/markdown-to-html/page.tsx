import type { Metadata } from "next";
import { MarkdownToHtmlTool } from "./markdown-to-html-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Markdown to HTML Converter",
  title: "Markdown to HTML Converter - Free Online Tool",
  description: "Convert Markdown to clean HTML instantly. Supports headings, bold, italic, code blocks, links, images, lists, blockquotes, and more. Live preview included.",
  slug: "markdown-to-html",
  keywords: ["markdown to html", "markdown converter", "md to html", "markdown to html converter", "convert markdown", "markdown preview"],
  faqs: [
    { question: "What Markdown features are supported?", answer: "Headings (h1-h6), bold, italic, strikethrough, inline code, fenced code blocks with language hints, links, images, unordered lists, ordered lists, blockquotes, and horizontal rules." },
    { question: "Is the conversion done server-side?", answer: "No. All conversion happens in your browser. Your text is never sent to any server, keeping your content completely private." },
    { question: "Can I use the generated HTML in my website?", answer: "Yes. The output is clean, semantic HTML that you can copy and paste directly into any website, CMS, or email template." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function MarkdownToHtmlPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Markdown to HTML Converter</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Convert Markdown to clean, semantic HTML in real time. Preview the rendered output or copy the raw HTML.</p>
      </div>
      <MarkdownToHtmlTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Markdown Syntax Reference</h2>
        <ul>
          <li><code># Heading 1</code> through <code>###### Heading 6</code></li>
          <li><code>**bold**</code> and <code>*italic*</code></li>
          <li><code>[link text](url)</code> for links</li>
          <li><code>![alt](url)</code> for images</li>
          <li><code>`inline code`</code> and fenced code blocks with <code>```</code></li>
          <li><code>- item</code> for unordered lists</li>
          <li><code>1. item</code> for ordered lists</li>
          <li><code>&gt; quote</code> for blockquotes</li>
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
