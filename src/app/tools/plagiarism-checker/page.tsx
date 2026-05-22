import type { Metadata } from "next";
import { PlagiarismTool } from "./plagiarism-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Plagiarism Checker",
  title: "Plagiarism Checker - Free Online Text Similarity Tool",
  description:
    "Check text uniqueness and compare documents for plagiarism. Uses n-gram analysis, cosine similarity, and sentence matching. 100% free, private, runs in your browser.",
  slug: "plagiarism-checker",
  keywords: [
    "plagiarism checker",
    "plagiarism detector",
    "text similarity checker",
    "duplicate content checker",
    "free plagiarism checker",
    "compare texts online",
    "content uniqueness checker",
  ],
  faqs: [
    {
      question: "How does plagiarism checking work?",
      answer:
        "The tool offers two modes: Uniqueness Check analyzes each sentence for personal, generic, or textbook-style patterns and provides Google search links for manual verification. Compare Texts uses Jaccard similarity, cosine similarity, and n-gram matching to measure overlap between two documents.",
    },
    {
      question: "Is my text safe and private?",
      answer:
        "Absolutely. All analysis runs 100% in your browser using JavaScript. No text is uploaded, stored, or sent to any server. Your content never leaves your device.",
    },
    {
      question: "Can this replace paid plagiarism tools?",
      answer:
        "This tool is great for quick checks and text comparison. For comprehensive web-based plagiarism scanning against billions of pages, you may still need a paid service. Our tool excels at document-to-document comparison and provides Google search links for manual web checking.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function PlagiarismCheckerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Plagiarism Checker
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Check text uniqueness or compare two documents for similarity. Uses
          advanced n-gram analysis, cosine similarity, and sentence matching.
        </p>
      </div>
      <PlagiarismTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How It Works</h2>
        <p>
          Our plagiarism checker offers two powerful modes for content analysis:
        </p>
        <h3>Check Uniqueness</h3>
        <p>
          Paste your text and the tool analyzes each sentence for uniqueness
          indicators. Sentences with personal pronouns, specific details, and
          informal language are flagged as likely unique. Formal, textbook-style
          sentences are flagged for manual verification. Each sentence includes a
          Google search link so you can check for exact matches online.
        </p>
        <h3>Compare Texts</h3>
        <p>
          Paste two texts side-by-side and get a detailed similarity breakdown
          using three proven algorithms:
        </p>
        <ul>
          <li>
            <strong>Cosine Similarity</strong> — Measures word frequency overlap
            between documents
          </li>
          <li>
            <strong>Jaccard Index</strong> — Calculates n-gram (word sequence)
            overlap
          </li>
          <li>
            <strong>Phrase Matching</strong> — Finds identical 5-word phrases
            across both texts
          </li>
        </ul>
        <p>
          The tool also performs sentence-level matching to identify the most
          similar passages between both texts.
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
