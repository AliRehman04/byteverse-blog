import type { Metadata } from "next";
import { AiDetectorTool } from "./ai-detector-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "AI Content Detector",
  title: "AI Content Detector - Free AI Text Detection Tool",
  description: "Detect AI-generated text using advanced linguistic analysis. Check if content was written by ChatGPT, Claude, or other AI models. 100% free, private, runs in your browser.",
  slug: "ai-content-detector",
  keywords: ["ai content detector", "ai text detector", "chatgpt detector", "ai writing detector", "ai detection tool", "detect ai content", "ai checker"],
  faqs: [
    { question: "How does AI detection work?", answer: "This tool analyzes 8 linguistic signals including sentence uniformity, vocabulary diversity, burstiness, AI phrase patterns, paragraph structure, personal voice, sentence starters, and punctuation variety to estimate the probability of AI-generated text." },
    { question: "Is this tool accurate?", answer: "This tool uses statistical heuristics and provides a reasonable estimate. It works best on English text of 100+ words. No AI detector is 100% accurate — use results as a guide alongside your own judgment." },
    { question: "Is my text safe?", answer: "Yes. All analysis runs entirely in your browser using JavaScript. No text is sent to any server, stored, or shared. Your content stays completely private." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function AiContentDetectorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">AI Content Detector</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze text for AI-generated patterns using 8 linguistic signals. Detects ChatGPT, Claude, Gemini, and other AI writing styles.</p>
      </div>
      <AiDetectorTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How It Works</h2>
        <p>Our AI content detector analyzes your text across 8 different linguistic dimensions that distinguish human writing from AI-generated content:</p>
        <ul>
          <li><strong>Sentence Uniformity</strong> — AI tends to write sentences of similar length, while humans vary naturally.</li>
          <li><strong>Vocabulary Diversity</strong> — AI often reuses a smaller set of &ldquo;sophisticated&rdquo; words.</li>
          <li><strong>Burstiness</strong> — Human writing alternates between simple and complex sentences; AI stays consistent.</li>
          <li><strong>AI Phrase Detection</strong> — Identifies signature phrases commonly used by ChatGPT and similar models.</li>
          <li><strong>Personal Voice</strong> — Checks for personal pronouns, contractions, and informal markers.</li>
        </ul>
        <h2>Tips for More Accurate Results</h2>
        <ul>
          <li>Paste at least 100 words for best accuracy</li>
          <li>Longer texts (300+ words) produce more reliable scores</li>
          <li>The tool works best with English prose — technical docs or code may give skewed results</li>
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
