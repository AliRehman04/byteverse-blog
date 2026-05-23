import type { Metadata } from "next";
import { YouTubeTagGeneratorTool } from "./youtube-tag-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "YouTube Tag Generator",
  title: "YouTube Tag Generator - Free Video Tag & Keyword Tool",
  description:
    "Generate optimized YouTube tags instantly. Enter your video title or keyword and get relevant, SEO-friendly tags to boost your video rankings and reach a wider audience.",
  slug: "youtube-tag-generator",
  keywords: [
    "youtube tag generator",
    "youtube tags",
    "video tag generator",
    "youtube seo tags",
    "youtube keyword tool",
    "free youtube tags",
    "rapidtags alternative",
    "youtube video optimization",
    "youtube tag finder",
    "generate tags for youtube",
  ],
  faqs: [
    {
      question: "What are YouTube tags and why do they matter?",
      answer:
        "YouTube tags are keywords you add to your video metadata to help YouTube understand your content. They improve discoverability by helping the algorithm recommend your video to viewers searching for related topics.",
    },
    {
      question: "How many tags should I use on a YouTube video?",
      answer:
        "YouTube allows up to 500 characters for tags. Aim for 5-15 relevant tags that mix broad and specific keywords. Quality matters more than quantity — irrelevant tags can hurt your rankings.",
    },
    {
      question: "Can YouTube tags help my video rank higher?",
      answer:
        "Yes. While tags are not the primary ranking factor (title and description are more important), they help YouTube understand your video context, especially for commonly misspelled terms and related topics.",
    },
    {
      question: "Is this YouTube Tag Generator free to use?",
      answer:
        "Yes, this tool is 100% free with unlimited generations. No sign-up required. Simply enter your keyword and generate optimized tags instantly.",
    },
    {
      question: "How do I add tags to my YouTube video?",
      answer:
        "Go to YouTube Studio → select your video → click Details → scroll down to 'Tags' (click 'Show More' if hidden) → paste your generated tags separated by commas.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function YouTubeTagGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          YouTube Tag Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Enter your video title or keyword and instantly generate
          SEO-optimized tags to boost your YouTube video&apos;s reach and
          discoverability.
        </p>
      </div>

      <YouTubeTagGeneratorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use YouTube Tags Effectively</h2>
        <p>
          YouTube tags help the algorithm understand the topic and context of
          your video. When used correctly, they can improve your video&apos;s
          visibility in search results and recommendations.
        </p>

        <h2>Best Practices for YouTube Tags</h2>
        <ul>
          <li>Put your most important keyword as the first tag</li>
          <li>Mix broad tags (&quot;cooking&quot;) with specific long-tail tags (&quot;easy pasta recipe for beginners&quot;)</li>
          <li>Include common misspellings or alternate spellings</li>
          <li>Use your channel/brand name as a tag</li>
          <li>Stay within the 500-character limit</li>
          <li>Only use tags that are relevant to your content</li>
        </ul>

        <h2>Tags vs. Hashtags on YouTube</h2>
        <p>
          Tags (added in video settings) are hidden metadata that help YouTube
          categorize your video. Hashtags (added in the title or description
          with #) are visible to viewers and create clickable links. Both serve
          different purposes — use tags for SEO and hashtags for discoverability.
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
