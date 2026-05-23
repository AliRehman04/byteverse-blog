import type { Metadata } from "next";
import { YouTubeDataExtractorTool } from "./youtube-data-extractor-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "YouTube Data Extractor",
  title: "YouTube Data Extractor - Get Thumbnail, Title, Tags & Description",
  description:
    "Extract thumbnail, title, description, and tags from any YouTube video or Shorts URL. Download HD thumbnails and copy metadata instantly.",
  slug: "youtube-data-extractor",
  keywords: [
    "youtube data extractor",
    "youtube thumbnail downloader",
    "extract youtube tags",
    "youtube video info",
    "youtube title extractor",
    "youtube description extractor",
    "youtube shorts thumbnail",
    "get youtube tags",
    "youtube metadata extractor",
    "youtube video data tool",
  ],
  faqs: [
    {
      question: "What data can I extract from a YouTube video?",
      answer:
        "This tool extracts the video thumbnail (in multiple resolutions), title, full description, channel name, and all tags/keywords from any YouTube video or Shorts URL.",
    },
    {
      question: "Does it work with YouTube Shorts?",
      answer:
        "Yes. Paste any YouTube Shorts URL (youtube.com/shorts/...) and it will extract the thumbnail, title, description, and tags just like a regular video.",
    },
    {
      question: "Can I download the video thumbnail?",
      answer:
        "Yes. The tool shows the thumbnail and provides download/open links. You can also copy thumbnail URLs in 5 different resolutions from Max Res (1280×720) down to Default (120×90).",
    },
    {
      question: "Why are no tags showing for some videos?",
      answer:
        "Not all YouTube videos have tags. Some creators choose not to add tags to their videos. In that case, the tags section will show 'No tags found'.",
    },
    {
      question: "Is this tool free to use?",
      answer:
        "Yes, this tool is 100% free with unlimited extractions. No sign-up or API key required.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function YouTubeDataExtractorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          YouTube Data Extractor
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Paste any YouTube video or Shorts link to extract the thumbnail,
          title, description, and tags instantly.
        </p>
      </div>

      <YouTubeDataExtractorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This Tool</h2>
        <p>
          Simply paste a YouTube video URL or Shorts URL into the input field
          and click &quot;Extract&quot;. The tool fetches the video page and
          parses all available metadata including the title, description,
          thumbnail, and tags.
        </p>

        <h2>Supported URL Formats</h2>
        <ul>
          <li>Standard: youtube.com/watch?v=VIDEO_ID</li>
          <li>Short link: youtu.be/VIDEO_ID</li>
          <li>Shorts: youtube.com/shorts/VIDEO_ID</li>
          <li>Embed: youtube.com/embed/VIDEO_ID</li>
          <li>Live: youtube.com/live/VIDEO_ID</li>
        </ul>

        <h2>Thumbnail Resolutions</h2>
        <p>
          YouTube generates thumbnails in multiple sizes. This tool lets you
          copy the direct URL for any resolution — from Max Res (1280×720) for
          blog headers and social media, to small defaults (120×90) for
          previews and lists.
        </p>

        <h2>Why Extract YouTube Data?</h2>
        <ul>
          <li>Download competitor thumbnails for design inspiration</li>
          <li>Analyze tags used by top-ranking videos in your niche</li>
          <li>Copy descriptions to study successful video SEO patterns</li>
          <li>Get thumbnail URLs for embedding in blogs or portfolios</li>
          <li>Research trending Shorts to understand what performs well</li>
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
