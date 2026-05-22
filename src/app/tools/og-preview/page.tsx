import type { Metadata } from "next";
import { OpenGraphPreviewTool } from "./og-preview-tool";

export const metadata: Metadata = {
  title: "Open Graph Preview - Free OG & Twitter Card Checker",
  description: "Preview how your links appear on Facebook, Twitter, LinkedIn, and Google. Generate Open Graph and Twitter Card meta tags instantly.",
  keywords: ["open graph preview", "og preview", "twitter card preview", "social media preview", "meta tag preview", "og image checker"],
  alternates: { canonical: "https://www.byteverse.fyi/tools/og-preview" },
};

export default function OgPreviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
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
    </main>
  );
}
