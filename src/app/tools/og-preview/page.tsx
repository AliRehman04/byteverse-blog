import type { Metadata } from "next";
import { OpenGraphPreviewTool } from "./og-preview-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Open Graph Preview",
  title: "Open Graph Preview - Free OG & Twitter Card Checker",
  description: "Preview how your links appear on Facebook, Twitter, LinkedIn, and Google. Generate Open Graph and Twitter Card meta tags instantly.",
  slug: "og-preview",
  keywords: ["open graph preview", "og preview", "twitter card preview", "social media preview", "meta tag preview", "og image checker"],
  faqs: [
    { question: "What are Open Graph tags?", answer: "Open Graph tags are HTML meta tags that control how your content appears when shared on social media. They define the title, description, image, and URL shown in link previews." },
    { question: "What image size should I use for OG images?", answer: "Use 1200 x 630 pixels (1.91:1 ratio) for Facebook and LinkedIn. For Twitter large image cards, use 1200 x 628 pixels." },
    { question: "Does this tool fetch my actual page?", answer: "No. This tool runs entirely in your browser. You enter the values manually and preview how they would look — no data is fetched or sent anywhere." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function OgPreviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Open Graph Preview</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Preview how your links will look when shared on Facebook, Twitter, LinkedIn, and Google. Generate the meta tags you need.</p>
      </div>
      <OpenGraphPreviewTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What are Open Graph Tags?</h2>
        <p>Open Graph (OG) tags are HTML meta tags that control how your content appears when shared on social media platforms. They define the title, description, image, and URL that social platforms display in link previews.</p>
        <h2>Recommended Image Sizes</h2>
        <ul>
          <li><strong>Facebook/LinkedIn:</strong> 1200 x 630 pixels (1.91:1 ratio)</li>
          <li><strong>Twitter summary_large_image:</strong> 1200 x 628 pixels (roughly 2:1)</li>
          <li><strong>Twitter summary:</strong> 120 x 120 pixels minimum</li>
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
