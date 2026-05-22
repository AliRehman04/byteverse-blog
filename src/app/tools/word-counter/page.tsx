import type { Metadata } from "next";
import { WordCounterTool } from "./word-counter-tool";

export const metadata: Metadata = {
  title: "Word & Character Counter - Free Online Tool",
  description:
    "Count words, characters, sentences, paragraphs, and estimated reading time instantly. Free tool for writers, students, and developers.",
  keywords: [
    "word counter",
    "character counter",
    "word count tool",
    "character count online",
    "reading time calculator",
    "text counter",
  ],
  alternates: { canonical: "https://www.byteverse.fyi/tools/word-counter" },
};

export default function WordCounterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Word & Character Counter
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Paste any text to instantly see word count, character count,
          sentences, paragraphs, and estimated reading time.
        </p>
      </div>

      <WordCounterTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How It Works</h2>
        <p>
          Type or paste text into the box above. The tool instantly calculates
          all metrics as you type. No need to click any button.
        </p>

        <h2>What Gets Counted</h2>
        <ul>
          <li><strong>Words</strong> - Separated by spaces, tabs, or line breaks</li>
          <li><strong>Characters</strong> - Total and without spaces</li>
          <li><strong>Sentences</strong> - Ending with period, question mark, or exclamation</li>
          <li><strong>Paragraphs</strong> - Separated by blank lines</li>
          <li><strong>Reading time</strong> - Based on average reading speed (200 words/min)</li>
          <li><strong>Speaking time</strong> - Based on average speaking speed (130 words/min)</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>How accurate is the word count?</h3>
        <p>Very accurate. It counts the same way as Microsoft Word and Google Docs.</p>
        <h3>What about different languages?</h3>
        <p>This tool works with any language that uses spaces between words, including English, Spanish, French, German, and more.</p>
        <h3>How is reading time calculated?</h3>
        <p>Based on an average adult reading speed of 200 words per minute. Actual speed varies by person and content complexity.</p>
      </section>
    </main>
  );
}
