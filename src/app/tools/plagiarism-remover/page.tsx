import type { Metadata } from "next";
import { PlagiarismRemoverTool } from "./plagiarism-remover-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Plagiarism Remover & AI Humanizer",
  title: "Plagiarism Remover & AI Humanizer - Rewrite Text for Free",
  description:
    "Remove plagiarism and humanize AI-generated text. Replaces AI phrases, swaps synonyms, adds contractions, and makes content unique. 100% free, private, runs in your browser.",
  slug: "plagiarism-remover",
  keywords: [
    "plagiarism remover",
    "ai humanizer",
    "text rewriter",
    "remove plagiarism",
    "humanize ai text",
    "paraphrasing tool",
    "rewrite text online",
    "remove ai detection",
    "make text unique",
  ],
  faqs: [
    {
      question: "How does the plagiarism remover work?",
      answer:
        "The tool uses three strategies: it replaces 55+ common AI phrases with human-sounding alternatives, swaps 150+ words with contextual synonyms, and adds natural contractions. A strength slider controls how aggressively the text is rewritten.",
    },
    {
      question: "Will this remove AI detection?",
      answer:
        "The tool targets specific patterns that AI detectors look for — formulaic transitions, overused phrases, lack of contractions, and robotic vocabulary. At medium-to-heavy strength, it significantly reduces AI detection scores. For best results, also manually edit the output to add your own voice.",
    },
    {
      question: "Is my text safe and private?",
      answer:
        "Yes. All rewriting happens entirely in your browser using JavaScript. No text is uploaded, stored, or sent to any server. Your content never leaves your device.",
    },
    {
      question: "Can I edit the rewritten text?",
      answer:
        "Yes. The output is fully editable. You can fine-tune the rewritten text, then use our Plagiarism Checker or AI Content Detector to verify the results.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function PlagiarismRemoverPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Plagiarism Remover & AI Humanizer
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Rewrite text to remove plagiarism and AI patterns. Replaces AI
          phrases, swaps synonyms, and adds natural contractions to make your
          content unique and human-sounding.
        </p>
      </div>
      <PlagiarismRemoverTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How It Works</h2>
        <p>
          The rewriting engine applies three layers of transformation to make
          your text unique:
        </p>
        <h3>1. AI Phrase Removal</h3>
        <p>
          Identifies and replaces 55+ formulaic phrases commonly used by
          ChatGPT, Claude, and other AI models — like &ldquo;in today&apos;s
          digital landscape&rdquo;, &ldquo;it is worth noting&rdquo;, and
          &ldquo;plays a crucial role&rdquo;. These are replaced with natural,
          human-sounding alternatives.
        </p>
        <h3>2. Synonym Replacement</h3>
        <p>
          Swaps 150+ overused words with contextual synonyms. Words like
          &ldquo;utilize&rdquo; become &ldquo;use&rdquo;,
          &ldquo;comprehensive&rdquo; becomes &ldquo;complete&rdquo;, and
          &ldquo;facilitate&rdquo; becomes &ldquo;help&rdquo;. The strength
          slider controls replacement aggressiveness.
        </p>
        <h3>3. Contraction Injection</h3>
        <p>
          AI models rarely use contractions. This tool converts &ldquo;it
          is&rdquo; to &ldquo;it&apos;s&rdquo;, &ldquo;do not&rdquo; to
          &ldquo;don&apos;t&rdquo;, and similar patterns — one of the fastest
          ways to make text feel human-written.
        </p>
        <h2>Tips for Best Results</h2>
        <ul>
          <li>
            Start with <strong>Medium strength</strong> (50%) for a balanced
            rewrite
          </li>
          <li>
            Use <strong>Heavy strength</strong> (70%+) for text that needs
            maximum transformation
          </li>
          <li>
            Always review and edit the output — add your personal touch for the
            best results
          </li>
          <li>
            After rewriting, verify with our{" "}
            <a href="/tools/ai-content-detector">AI Content Detector</a> and{" "}
            <a href="/tools/plagiarism-checker">Plagiarism Checker</a>
          </li>
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
